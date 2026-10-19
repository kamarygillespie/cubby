import { describe, expect, test } from "vitest";
import { deleteItemImage, uploadItemImage } from "./item-images";
import { itemImagePathFromUrl } from "@/lib/item-form";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts. Exercises the item-images storage RLS that
// editing/deleting items relies on.

const pngFile = () =>
  new File([new Uint8Array([137, 80, 78, 71])], "photo.png", {
    type: "image/png",
  });

async function exists(url: string) {
  const path = itemImagePathFromUrl(url)!;
  const [folder, name] = path.split("/");
  const { data } = await admin.storage
    .from("item-images")
    .list(folder, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

describe("lib/db/item-images (integration)", () => {
  test("the owner can delete their uploaded image", async () => {
    const { userId, client } = await createTestUser();
    const url = await uploadItemImage(client, userId, pngFile());
    expect(await exists(url)).toBe(true);

    await deleteItemImage(client, url);
    expect(await exists(url)).toBe(false);
  });

  test("another user cannot delete someone else's image (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const url = await uploadItemImage(owner.client, owner.userId, pngFile());

    await deleteItemImage(other.client, url);
    expect(await exists(url)).toBe(true);
  });

  test("external image URLs are left alone", async () => {
    const { client } = await createTestUser();
    await expect(
      deleteItemImage(client, "https://images.puma.com/x.png"),
    ).resolves.toBeUndefined();
  });
});
