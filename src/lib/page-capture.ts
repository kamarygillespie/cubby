// Save to Cubby (KAM-65): reads a product page in the user's own browser and
// hands the details to Add item. Works on stores that block Cubby's server,
// because the page is already open on the user's device.
import { normalizeProductLink } from "./item-form";

export type CapturedProduct = {
  link: string;
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  store: string | null;
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const money = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  value < 10_000_000
    ? Math.round(value * 100) / 100
    : null;

function webAddress(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

// The data arrives in a URL, so nothing in it is trusted: every field is
// checked here, and the user still reviews it before anything is saved.
export function parseCapture(raw: string | null | undefined) {
  if (!raw || raw.length > 12_000) return null;
  try {
    const data: unknown = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    );
    if (!data || typeof data !== "object") return null;
    const fields = data as Record<string, unknown>;

    const link = normalizeProductLink(String(fields.l ?? ""));
    if (!link) return null;

    const price = money(fields.p);
    const sale = money(fields.s);
    return {
      link,
      title: text(fields.t, 300),
      image: webAddress(fields.i),
      price,
      salePrice: price !== null && sale !== null && sale < price ? sale : null,
      store: text(fields.b, 120),
    } satisfies CapturedProduct;
  } catch {
    return null;
  }
}

// Runs on the store's page. Kept dependency-free and self-contained.
function pageReader(origin: string, finish: string) {
  return `(function(){
var d=document;
var meta=function(n){var e=d.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e&&e.content?e.content:null};
var num=function(v){if(v===null||v===undefined)return null;var x=parseFloat(String(v).replace(/[^0-9.]/g,''));return x>0?x:null};
var found=[];
var walk=function(n){if(Array.isArray(n)){n.forEach(walk);return}if(!n||typeof n!=='object')return;var t=[].concat(n['@type']||[]);if(t.indexOf('Product')>-1||t.indexOf('ProductGroup')>-1)found.push(n);if(n['@graph'])walk(n['@graph'])};
d.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{walk(JSON.parse(s.textContent))}catch(e){}});
var first=function(v){return Array.isArray(v)?v[0]:v};
var offerOf=function(p){var o=first(p.offers);if(o&&o.offers)o=first(o.offers);if(!o&&p.hasVariant){var v=first(p.hasVariant);o=v&&first(v.offers);if(o&&o.offers)o=first(o.offers)}return o||null};
var product=found.filter(function(p){return p.name&&offerOf(p)})[0]||found.filter(function(p){return p.name})[0]||{};
var offer=offerOf(product)||{};
var current=num(offer.price||offer.lowPrice);
var original=null;
[].concat(offer.priceSpecification||[]).forEach(function(s){if(s&&/Strikethrough|ListPrice|MSRP/i.test(String(s.priceType||''))&&!original)original=num(s.price)});
if(!current){var sale=num(meta('product:sale_price:amount'));var regular=num(meta('product:price:amount'));current=sale||regular||num(meta('og:price:amount'));if(sale&&regular)original=regular}
if(!original)original=num(meta('product:original_price:amount'));
if(!current){var el=d.querySelector('[itemprop="price"]');if(el)current=num(el.getAttribute('content')||el.textContent)}
var html=d.documentElement.innerHTML;
var usd=num((html.match(/sale_price_usd[\\\\"\\s:]+([\\d.]+)/)||[])[1]);
var home=(html.match(/currency_code[\\\\"\\s:]+([A-Z]{3})/)||[])[1];
var homeSale=num((html.match(/discount_price_list[\\s\\S]{0,40}?sale_price[\\\\"\\s:]+([\\d.]+)/)||[])[1])||current;
var metaCurrency=(meta('product:price:currency')||meta('og:price:currency')||'').toUpperCase();
var offerCurrency=String(offer.priceCurrency||'').toUpperCase();
if(usd&&home&&home!=='USD'&&homeSale){var list=num(meta('product:price:amount'));original=list&&list>homeSale?Math.round(list*usd*100/homeSale)/100:null;current=usd}
else if((metaCurrency&&metaCurrency!=='USD')||(offerCurrency&&offerCurrency!=='USD')){current=null;original=null}
var image=first(product.image);if(image&&image.url)image=image.url;if(!image&&product.hasVariant){var pv=first(product.hasVariant);image=pv&&first(pv.image)}image=image||meta('og:image');
var brand=first(product.brand);if(brand&&brand.name)brand=brand.name;
var h1=d.querySelector('h1');
var canonical=d.querySelector('link[rel="canonical"]');
var abs=function(u){try{return new URL(u,location.href).href}catch(e){return null}};
var data={l:(canonical&&abs(canonical.getAttribute('href')))||location.href,t:product.name||meta('og:title')||(h1&&h1.textContent)||d.title,i:typeof image==='string'?abs(image):null,p:original&&current&&original>current?original:current,s:original&&current&&original>current?current:null,b:(typeof brand==='string'&&brand)||meta('og:site_name')};
var encoded=btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
var target=${JSON.stringify(origin)}+'/items/new?capture='+encoded;
${finish}
})()`;
}

// A bookmark: clicking it on a product page opens Cubby in a new tab, so the
// store's page stays open for reference. If the browser blocks the new tab,
// Cubby opens in the current one instead of doing nothing.
const OPEN_IN_NEW_TAB =
  "var opened=window.open(target,'_blank');if(opened){try{opened.opener=null}catch(e){}}else{location.href=target}";

export const captureBookmarklet = (origin: string) =>
  `javascript:${encodeURIComponent(pageReader(origin, OPEN_IN_NEW_TAB))}`;

// For Apple's Shortcuts app ("Run JavaScript on Web Page").
export const captureShortcutScript = (origin: string) =>
  pageReader(origin, "completion(target);");

// The plain script, for tests.
export const captureScript = (origin: string) =>
  pageReader(origin, "location.href=target;");
