import { assertEquals } from "jsr:@std/assert@1";
import {
  b64urlDecode,
  b64urlEncode,
  encryptPayload,
  sendPush,
  vapidAuthorization,
} from "./web-push.ts";

async function importEcdhKeyPair(d: string, publicKey: string) {
  const pub = b64urlDecode(publicKey);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
  };
  const alg = { name: "ECDH", namedCurve: "P-256" };
  return {
    privateKey: await crypto.subtle.importKey("jwk", { ...jwk, d }, alg, true, [
      "deriveBits",
    ]),
    publicKey: await crypto.subtle.importKey("jwk", jwk, alg, true, []),
  } as CryptoKeyPair;
}

// RFC 8291 Appendix A — the spec's own worked example.
Deno.test("encryptPayload reproduces RFC 8291's example", async () => {
  const asKeys = await importEcdhKeyPair(
    "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  );
  const body = await encryptPayload(
    new TextEncoder().encode("When I grow up, I want to be a watermelon"),
    {
      p256dh:
        "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
    { asKeys, salt: b64urlDecode("DGv6ra1nlYgDCS1FRnbzlw") },
  );
  assertEquals(
    b64urlEncode(body),
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
  );
});

async function newVapid() {
  const keys = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", keys.privateKey);
  const raw = new Uint8Array(
    await crypto.subtle.exportKey("raw", keys.publicKey),
  );
  return {
    keys,
    vapid: {
      publicKey: b64urlEncode(raw),
      privateKey: jwk.d!,
      subject: "https://cubby.example",
    },
  };
}

Deno.test(
  "vapidAuthorization signs a verifiable ES256 JWT for the push origin",
  async () => {
    const { keys, vapid } = await newVapid();
    const header = await vapidAuthorization(
      "https://fcm.googleapis.com/fcm/send/abc",
      vapid,
      1_700_000_000_000,
    );
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    assertEquals(k, vapid.publicKey);
    const [h, c, sig] = token.split(".");
    assertEquals(JSON.parse(new TextDecoder().decode(b64urlDecode(c))), {
      aud: "https://fcm.googleapis.com",
      exp: 1_700_000_000 + 12 * 3600,
      sub: "https://cubby.example",
    });
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      keys.publicKey,
      b64urlDecode(sig),
      new TextEncoder().encode(`${h}.${c}`),
    );
    assertEquals(ok, true);
  },
);

Deno.test("sendPush reports expired subscriptions as gone", async () => {
  const { vapid } = await newVapid();
  const ua = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;
  const target = {
    endpoint: "https://push.example/sub",
    p256dh: b64urlEncode(
      new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey)),
    ),
    auth: b64urlEncode(crypto.getRandomValues(new Uint8Array(16))),
  };
  const seen: Request[] = [];
  const fakeFetch = (status: number) =>
    ((input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Request(input, init));
      return Promise.resolve(new Response(null, { status }));
    }) as typeof fetch;

  assertEquals(
    await sendPush(target, { title: "Hi" }, vapid, fakeFetch(201)),
    "sent",
  );
  assertEquals(seen[0].headers.get("content-encoding"), "aes128gcm");
  assertEquals(await sendPush(target, {}, vapid, fakeFetch(410)), "gone");
  assertEquals(await sendPush(target, {}, vapid, fakeFetch(404)), "gone");
  assertEquals(await sendPush(target, {}, vapid, fakeFetch(500)), "failed");
});
