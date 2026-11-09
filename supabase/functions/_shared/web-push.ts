// Minimal Web Push sender (KAM-54), WebCrypto only — no Node polyfills.
//   * Payload encryption: RFC 8291 (aes128gcm content coding, RFC 8188).
//   * Sender identity: VAPID, RFC 8292 (ES256 JWT).
// Keys are base64url: the VAPID public key is the 65-byte uncompressed P-256
// point; the private key is the 32-byte scalar `d`.

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { publicKey: string; privateKey: string; subject: string };

const enc = new TextEncoder();

// Byte arrays backed by a plain ArrayBuffer, which WebCrypto's types require.
type Bytes = Uint8Array<ArrayBuffer>;

export function b64urlEncode(bytes: Bytes): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(text: string): Bytes {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hkdf(
  salt: Bytes,
  ikm: Bytes,
  info: Bytes,
  length: number,
): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// RFC 8291 §3.4: derive the content key and nonce from the ECDH secret.
export async function deriveContentKeys(
  sharedSecret: Bytes,
  authSecret: Bytes,
  uaPublic: Bytes,
  asPublic: Bytes,
  salt: Bytes,
) {
  const ikm = await hkdf(
    authSecret,
    sharedSecret,
    concat(enc.encode("WebPush: info\0"), uaPublic, asPublic),
    32,
  );
  const cek = await hkdf(
    salt,
    ikm,
    enc.encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    enc.encode("Content-Encoding: nonce\0"),
    12,
  );
  return { cek, nonce };
}

// Encrypts `payload` for one subscription. Returns the full aes128gcm body
// (header + single record).
// `fixed` exists only so tests can reproduce RFC 8291's worked example.
export async function encryptPayload(
  payload: Bytes,
  target: Pick<PushTarget, "p256dh" | "auth">,
  fixed?: { asKeys: CryptoKeyPair; salt: Bytes },
): Promise<Bytes> {
  const uaPublic = b64urlDecode(target.p256dh);
  const authSecret = b64urlDecode(target.auth);
  const asKeys =
    fixed?.asKeys ??
    ((await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    )) as CryptoKeyPair);
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", asKeys.publicKey),
  );
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaKey },
      asKeys.privateKey,
      256,
    ),
  );
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const { cek, nonce } = await deriveContentKeys(
    shared,
    authSecret,
    uaPublic,
    asPublic,
    salt,
  );
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  // One record: payload + 0x02 (last-record delimiter).
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      concat(payload, new Uint8Array([2])),
    ),
  );
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(
    salt,
    recordSize,
    new Uint8Array([asPublic.length]),
    asPublic,
    ciphertext,
  );
}

// RFC 8292: `Authorization: vapid t=<JWT>, k=<public key>`.
export async function vapidAuthorization(
  endpoint: string,
  vapid: Vapid,
  now = Date.now(),
): Promise<string> {
  const pub = b64urlDecode(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: vapid.privateKey,
      x: b64urlEncode(pub.slice(1, 33)),
      y: b64urlEncode(pub.slice(33, 65)),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64urlEncode(
    enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const claims = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(now / 1000) + 12 * 3600,
        sub: vapid.subject,
      }),
    ),
  );
  // WebCrypto ECDSA signatures are already raw r||s, as JWS ES256 expects.
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      enc.encode(`${header}.${claims}`),
    ),
  );
  return `vapid t=${header}.${claims}.${b64urlEncode(signature)}, k=${vapid.publicKey}`;
}

export type PushResult = "sent" | "gone" | "failed";

// Sends one push. "gone" (404/410) means the subscription expired or the
// user revoked permission — the caller should delete it.
export async function sendPush(
  target: PushTarget,
  payload: unknown,
  vapid: Vapid,
  fetchImpl: typeof fetch = fetch,
): Promise<PushResult> {
  const body = await encryptPayload(
    enc.encode(JSON.stringify(payload)),
    target,
  );
  const res = await fetchImpl(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 3600),
      Urgency: "normal",
    },
    body,
  });
  await res.body?.cancel();
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "sent" : "failed";
}
