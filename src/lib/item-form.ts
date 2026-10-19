// Pure parsing for the add/edit item form, shared by both server actions.

export type ItemFormValues = {
  title: string;
  item_type_id: string;
  price: number | null;
  sale_price: number | null;
  interest_level: number | null;
  store_brand: string | null;
  link: string | null;
  notes: string | null;
};

export type ParsedItemForm =
  { ok: true; values: ItemFormValues } | { ok: false; error: string };

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): string | null {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// "" → null; anything that isn't a finite number → NaN (caught below).
function optionalNumber(form: FormLike, name: string): number | null {
  const raw = text(form, name);
  return raw === null ? null : Number(raw);
}

export function parseItemForm(form: FormLike): ParsedItemForm {
  const title = text(form, "title");
  const itemTypeId = text(form, "item_type_id");
  if (!title) return { ok: false, error: "Title is required." };
  if (!itemTypeId) return { ok: false, error: "Item type is required." };

  const price = optionalNumber(form, "price");
  const salePrice = optionalNumber(form, "sale_price");
  for (const [label, value] of [
    ["Price", price],
    ["Sale price", salePrice],
  ] as const) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      return { ok: false, error: `${label} must be a number of 0 or more.` };
    }
  }

  const interest = optionalNumber(form, "interest_level");
  if (
    interest !== null &&
    !(Number.isInteger(interest) && interest >= 1 && interest <= 5)
  ) {
    return { ok: false, error: "Interest level must be 1–5 stars." };
  }

  return {
    ok: true,
    values: {
      title,
      item_type_id: itemTypeId,
      price,
      sale_price: salePrice,
      interest_level: interest,
      store_brand: text(form, "store_brand"),
      link: text(form, "link"),
      notes: text(form, "notes"),
    },
  };
}

const ITEM_IMAGES_PUBLIC_PATH = "/storage/v1/object/public/item-images/";

// The bucket path of an image we host ("<user_id>/<file>"), or null for an
// external/legacy URL we must not try to delete.
export function itemImagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    if (!pathname.startsWith(ITEM_IMAGES_PUBLIC_PATH)) return null;
    const path = decodeURIComponent(
      pathname.slice(ITEM_IMAGES_PUBLIC_PATH.length),
    );
    return path && !path.includes("..") ? path : null;
  } catch {
    return null;
  }
}
