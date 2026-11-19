// Suggests item types for a product from its name, the store's own category
// and its link (KAM-58). Plain keyword matching, no AI or outside service.
// These are only suggestions: the user always confirms the type with a tap.

export type TypeOption = { id: string; name: string };

export type ProductText = {
  title?: string | null;
  category?: string | null;
  link?: string | null;
};

// Keywords for the built-in item types (supabase/seed.sql), lowercase. Longer
// phrases count for more, so "sports bra" beats "bra".
const KEYWORDS: Record<string, string[]> = {
  "short sleeve blouses & tops": [
    "tee",
    "tees",
    "t shirt",
    "tshirt",
    "baby tee",
    "tank",
    "tank top",
    "cami",
    "camisole",
    "crop top",
    "short sleeve",
    "short sleeve top",
    "short sleeve shirt",
  ],
  "long sleeve blouses & tops": [
    "blouse",
    "shirt",
    "button up",
    "button down",
    "long sleeve",
    "long sleeve top",
    "long sleeve shirt",
  ],
  "long sleeve sweaters": [
    "sweater",
    "sweaters",
    "cardigan",
    "pullover",
    "crewneck",
    "turtleneck",
    "cashmere",
    "knitwear",
    "long sleeve sweater",
  ],
  "short sleeve sweaters": [
    "short sleeve sweater",
    "sweater tee",
    "sweater vest",
    "knit tee",
  ],
  "sports bras": ["sports bra", "sports bras"],
  "short sleeve active tops": [
    "active tee",
    "running tee",
    "training tee",
    "workout tee",
    "performance tee",
  ],
  "long sleeve active tops": [
    "half zip",
    "quarter zip",
    "active long sleeve",
    "running long sleeve",
    "training long sleeve",
  ],
  "pajama tops & bottoms": [
    "pajama",
    "pajamas",
    "pyjama",
    "pyjamas",
    "sleepwear",
    "sleep set",
    "nightgown",
  ],
  "lounge tops & bottoms": [
    "lounge",
    "loungewear",
    "sweatshirt",
    "hoodie",
    "sweatpants",
    "sweatpant",
  ],
  "lounge underwear": [
    "underwear",
    "bra",
    "bralette",
    "brief",
    "briefs",
    "thong",
    "boyshort",
  ],
  "gym pants": [
    "legging",
    "leggings",
    "jogger",
    "joggers",
    "yoga pant",
    "yoga pants",
    "gym pant",
    "gym pants",
    "align pant",
    "high rise pant",
  ],
  "jackets & coats": [
    "jacket",
    "jackets",
    "coat",
    "coats",
    "blazer",
    "blazers",
    "trench",
    "trench coat",
    "puffer",
    "parka",
    "bomber",
    "shacket",
    "denim jacket",
    "leather jacket",
    "moto jacket",
  ],
  "active jackets": [
    "active jacket",
    "activewear jacket",
    "athletic jacket",
    "gym jacket",
    "running jacket",
    "track jacket",
    "training jacket",
    "workout jacket",
    "yoga jacket",
    "windbreaker",
    "define jacket",
  ],
  "gym tops": ["gym top", "workout top", "training top", "active tank"],
  skincare: [
    "skincare",
    "serum",
    "moisturizer",
    "cleanser",
    "toner",
    "sunscreen",
    "spf",
    "retinol",
    "eye cream",
    "face cream",
    "face mask",
    "sleeping mask",
    "lip mask",
    "lip balm",
  ],
  makeup: [
    "makeup",
    "lipstick",
    "lip gloss",
    "lip liner",
    "mascara",
    "foundation",
    "concealer",
    "blush",
    "bronzer",
    "eyeshadow",
    "eyeliner",
    "highlighter",
    "setting spray",
  ],
  bodycare: [
    "bodycare",
    "body wash",
    "body lotion",
    "body oil",
    "body butter",
    "body scrub",
    "hand cream",
    "deodorant",
    "perfume",
    "fragrance",
  ],
  haircare: [
    "haircare",
    "hair",
    "shampoo",
    "conditioner",
    "airwrap",
    "hair dryer",
    "flat iron",
    "curling iron",
    "straightener",
  ],
  technology: [
    "technology",
    "electronics",
    "headphones",
    "earbuds",
    "airpods",
    "iphone",
    "ipad",
    "macbook",
    "laptop",
    "tablet",
    "charger",
    "speaker",
    "smartwatch",
    "kindle",
    "camera",
    "keyboard",
    "monitor",
    "phone case",
  ],
  flats: [
    "flat",
    "flats",
    "ballet flat",
    "ballet flats",
    "mary jane",
    "mary janes",
  ],
  boots: ["boot", "boots", "bootie", "booties", "ankle boot", "chelsea boot"],
  sneakers: [
    "sneaker",
    "sneakers",
    "trainer",
    "trainers",
    "runner",
    "runners",
    "running shoe",
    "running shoes",
    "tennis shoe",
    "tennis shoes",
  ],
  "loafers/clogs": [
    "loafer",
    "loafers",
    "clog",
    "clogs",
    "mule",
    "mules",
    "moccasin",
    "moccasins",
  ],
  earrings: ["earring", "earrings", "hoops", "huggie", "huggies", "studs"],
  bracelets: ["bracelet", "bracelets", "bangle", "bangles", "cuff"],
  necklaces: ["necklace", "necklaces", "pendant", "choker"],
  jewelry: ["jewelry", "jewellery", "ring", "rings", "anklet", "brooch"],
};

// Where a word was found matters: the product's name says the most.
const WEIGHTS = { title: 3, category: 2, link: 1 } as const;

// "Baby-Tee (Women's)" → " baby tee women s ", so phrases match whole words.
function normalize(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return words ? ` ${words} ` : "";
}

// Only the page address counts, not the store's domain or tracking values.
function linkWords(link: string | null | undefined): string {
  if (!link) return "";
  try {
    return normalize(decodeURIComponent(new URL(link).pathname));
  } catch {
    return "";
  }
}

// A custom type matches on its own name, singular or plural ("Candles").
function keywordsFor(name: string): string[] {
  const lower = name.toLowerCase();
  const builtIn = KEYWORDS[lower];
  if (builtIn) return builtIn;
  const phrase = normalize(name).trim();
  if (!phrase) return [];
  return [phrase, phrase.replace(/s$/, "")];
}

export function suggestItemTypes<T extends TypeOption>(
  product: ProductText,
  types: readonly T[],
  limit = 3,
): T[] {
  const fields = [
    [normalize(product.title ?? ""), WEIGHTS.title],
    [normalize(product.category ?? ""), WEIGHTS.category],
    [linkWords(product.link), WEIGHTS.link],
  ] as const;

  const scored = types.flatMap((type) => {
    let score = 0;
    for (const keyword of new Set(keywordsFor(type.name))) {
      const needle = ` ${normalize(keyword).trim()} `;
      const words = needle.trim().split(" ").length;
      for (const [text, weight] of fields) {
        if (text.includes(needle)) score += weight * words;
      }
    }
    return score > 0 ? [{ type, score }] : [];
  });
  if (scored.length === 0) return [];

  // Weak matches next to a strong one are noise.
  const best = Math.max(...scored.map((s) => s.score));
  return scored
    .filter((s) => s.score >= best / 3)
    .sort((a, b) => b.score - a.score || a.type.name.localeCompare(b.type.name))
    .slice(0, limit)
    .map((s) => s.type);
}
