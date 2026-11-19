"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ImageIcon, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoInput } from "@/components/photo-input";
import { formatCurrency } from "@/lib/format";
import { normalizeProductLink } from "@/lib/item-form";
import { displayDiscountPercent } from "@/lib/items-view";
import { suggestItemTypes } from "@/lib/item-type-suggestions";
import type { CapturedProduct } from "@/lib/page-capture";
import { cn } from "@/lib/utils";
import { copyCapturedImage, fetchLinkDetails } from "../fetch-link-details";
import { ItemTypeField, type ItemTypeOption } from "../item-type-field";
import type { ItemFormState } from "../item-form-state";
import { StarRatingInput } from "../star-rating-input";

type Step = "link" | "finding" | "review";
type FieldErrors = { title?: string; itemType?: string; link?: string };

const toNumber = (value: string) => {
  const parsed = value.trim() === "" ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Add item (KAM-57): starts with just a product link, then shows what was
// found and asks only for what Cubby can't work out. Everything else stays
// available behind "Add details".
export function AddItemFlow({
  itemTypesByCategory,
  categories,
  action,
  sharedLink = null,
  captured = null,
}: {
  itemTypesByCategory: { category: string; itemTypes: ItemTypeOption[] }[];
  categories: { id: string; name: string }[];
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  // A link from the phone share sheet (Share to Cubby), fetched right away.
  sharedLink?: string | null;
  // Details read from the page the user is viewing (Save to Cubby, KAM-65).
  captured?: CapturedProduct | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const [step, setStep] = useState<Step>(
    captured ? "review" : sharedLink ? "finding" : "link",
  );
  const [linkDraft, setLinkDraft] = useState(sharedLink ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);
  // True when the page gave us enough to show a product preview.
  const [found, setFound] = useState(Boolean(captured?.title));
  const [fetchFailed, setFetchFailed] = useState(false);
  // The store refused to let Cubby read the page (e.g. H&M).
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [title, setTitle] = useState(captured?.title ?? "");
  const [price, setPrice] = useState(
    captured?.price != null ? String(captured.price) : "",
  );
  const [salePrice, setSalePrice] = useState(
    captured?.salePrice != null ? String(captured.salePrice) : "",
  );
  const [storeBrand, setStoreBrand] = useState(captured?.store ?? "");
  const [link, setLink] = useState(captured?.link ?? "");
  const [notes, setNotes] = useState("");
  const [itemTypeId, setItemTypeId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ItemTypeOption[]>(() =>
    captured
      ? suggestItemTypes(
          { title: captured.title, link: captured.link },
          itemTypesByCategory.flatMap((group) => group.itemTypes),
        )
      : [],
  );
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  // The store's own photo, shown until Cubby has its own copy.
  const [capturedPhoto, setCapturedPhoto] = useState(captured?.image ?? null);
  const [photoNotSaved, setPhotoNotSaved] = useState(false);
  const [chosenPhoto, setChosenPhoto] = useState<string | null>(null);

  // Only the latest lookup counts, so "add it yourself" can abandon one.
  const lookup = useRef(0);

  async function findDetails(url: string) {
    const id = ++lookup.current;
    setLink(url);
    setLinkError(null);
    setStep("finding");

    const details = await fetchLinkDetails(url);
    if (id !== lookup.current) return;

    if (details?.title) setTitle(details.title);
    if (details?.price != null) setPrice(String(details.price));
    if (details?.salePrice != null) setSalePrice(String(details.salePrice));
    if (details?.image) setFetchedImage(details.image);
    if (details?.store) setStoreBrand(details.store);
    setSuggestions(
      suggestItemTypes(
        { title: details?.title, category: details?.category, link: url },
        itemTypesByCategory.flatMap((group) => group.itemTypes),
      ),
    );
    setFound(Boolean(details?.title));
    setFetchFailed(!details?.title);
    setBlockedBy(details?.blocked ? (details.store ?? "This store") : null);
    setStep("review");
  }

  // Share to Cubby arrives with a link already chosen.
  useEffect(() => {
    if (!sharedLink) return;
    const timer = setTimeout(
      () => void findDetails(normalizeProductLink(sharedLink) ?? sharedLink),
      0,
    );
    return () => clearTimeout(timer);
    // Runs only for the link the page opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedLink]);

  // Keeps a copy of a captured photo. Cubby's server tries first; if the store
  // blocks that too, the user's browser tries, then the user is told.
  useEffect(() => {
    if (!captured?.image) return;
    const { link: pageLink, image } = captured;
    let current = true;
    const timer = setTimeout(async () => {
      const stored = await copyCapturedImage(pageLink, image);
      if (!current) return;
      if (stored) {
        setFetchedImage(stored);
        setCapturedPhoto(null);
        return;
      }
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const input = document.getElementById("image");
        if (!current) return;
        if (!response.ok || !blob.type.startsWith("image/")) throw new Error();
        if (!(input instanceof HTMLInputElement)) throw new Error();
        const files = new DataTransfer();
        files.items.add(new File([blob], "photo", { type: blob.type }));
        input.files = files.files;
      } catch {
        if (current) setPhotoNotSaved(true);
      }
    }, 0);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [captured]);

  function submitLink(raw: string) {
    const url = normalizeProductLink(raw);
    if (!url) {
      setLinkError("That doesn't look like a link. Try pasting it again.");
      return;
    }
    void findDetails(url);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!normalizeProductLink(pasted)) return;
    event.preventDefault();
    setLinkDraft(pasted.trim());
    submitLink(pasted);
  }

  function addManually(keepLink: string | null) {
    lookup.current += 1;
    setSuggestions([]);
    setLink(keepLink ?? "");
    setFound(false);
    setFetchFailed(false);
    setBlockedBy(null);
    setStep("review");
  }

  function startOver() {
    lookup.current += 1;
    setStep("link");
    setLinkDraft("");
    setLinkError(null);
    setFound(false);
    setFetchFailed(false);
    setBlockedBy(null);
    setDetailsOpen(false);
    setErrors({});
    setItemTypeId(null);
    setSuggestions([]);
    setCapturedPhoto(null);
    setPhotoNotSaved(false);
    setTitle("");
    setPrice("");
    setSalePrice("");
    setStoreBrand("");
    setLink("");
    setNotes("");
    setFetchedImage(null);
    setChosenPhoto(null);
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "Give this item a name.";
    if (!itemTypeId) next.itemType = "Choose what kind of item this is.";
    if (link.trim() && !normalizeProductLink(link)) {
      next.link = "That doesn't look like a link.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) return;

    event.preventDefault();
    if (next.title || next.link) setDetailsOpen(true);
    const firstInvalid = next.title
      ? "title"
      : next.itemType
        ? "item_type_id"
        : "link";
    setTimeout(() => document.getElementById(firstInvalid)?.focus(), 0);
  }

  if (step === "link") {
    return (
      <div className="flex flex-col gap-6 pt-6 sm:pt-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add something you love
          </h1>
          <p className="text-muted-foreground">
            Paste a product link and Cubby will find the details.
          </p>
        </div>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submitLink(linkDraft);
          }}
        >
          <Label htmlFor="product-link" className="sr-only">
            Product link
          </Label>
          <div className="relative">
            <Link2
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="product-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoFocus
              placeholder="Paste a product link"
              className="h-12 pl-11 text-base"
              value={linkDraft}
              aria-invalid={linkError ? true : undefined}
              aria-describedby={linkError ? "product-link-error" : undefined}
              onChange={(event) => {
                setLinkDraft(event.target.value);
                setLinkError(null);
              }}
              onPaste={handlePaste}
            />
          </div>
          {linkError && (
            <p
              id="product-link-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {linkError}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-11"
            disabled={!linkDraft}
          >
            Find details
          </Button>
        </form>
        <Button
          type="button"
          variant="link"
          className="self-center"
          onClick={() => addManually(null)}
        >
          Add without a link
        </Button>
      </div>
    );
  }

  if (step === "finding") {
    return (
      <div
        className="flex flex-col items-center gap-4 pt-16 text-center"
        role="status"
      >
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-medium">Finding the details…</p>
          <p className="text-muted-foreground max-w-full truncate text-sm">
            {link}
          </p>
        </div>
        <Button type="button" variant="link" onClick={() => addManually(link)}>
          Add it yourself instead
        </Button>
      </div>
    );
  }

  const photo = chosenPhoto ?? fetchedImage ?? capturedPhoto;
  const unoptimizedPhoto = photo === chosenPhoto || photo === capturedPhoto;
  const priceValue = toNumber(price);
  const saleValue = toNumber(salePrice);
  const discount = displayDiscountPercent(priceValue, saleValue);
  const onSale = discount !== null && saleValue !== null;
  const showPreview = found;

  const titleField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="title">Title</Label>
      <Input
        id="title"
        name="title"
        value={title}
        aria-invalid={errors.title ? true : undefined}
        aria-describedby={errors.title ? "title-error" : undefined}
        onChange={(event) => {
          setTitle(event.target.value);
          setErrors((prev) => ({ ...prev, title: undefined }));
        }}
      />
      {errors.title && (
        <p id="title-error" role="alert" className="text-destructive text-sm">
          {errors.title}
        </p>
      )}
    </div>
  );

  return (
    <form
      action={formAction}
      onSubmit={validate}
      noValidate
      className="flex flex-col gap-5"
    >
      <input
        type="hidden"
        name="autofill_image_url"
        value={fetchedImage ?? ""}
      />

      {showPreview ? (
        <section
          aria-label="Product found"
          className="bg-card overflow-hidden rounded-2xl border"
        >
          <div className="bg-muted relative h-28 w-full sm:h-56">
            {photo ? (
              <Image
                src={photo}
                alt=""
                fill
                sizes="(min-width: 640px) 448px, 100vw"
                unoptimized={unoptimizedPhoto}
                className="object-contain"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                <ImageIcon className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 p-4">
            <p className="line-clamp-2 font-medium">{title}</p>
            {(priceValue !== null || storeBrand.trim()) && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {onSale ? (
                  <>
                    <span className="font-medium">
                      {formatCurrency(saleValue)}
                    </span>
                    <span className="text-muted-foreground line-through">
                      {formatCurrency(priceValue as number)}
                    </span>
                    <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs font-semibold">
                      -{discount}%
                    </span>
                  </>
                ) : (
                  priceValue !== null && (
                    <span className="font-medium">
                      {formatCurrency(priceValue)}
                    </span>
                  )
                )}
                {storeBrand.trim() && (
                  <span className="text-muted-foreground">
                    {storeBrand.trim()}
                  </span>
                )}
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Add item</h1>
          {fetchFailed && (
            <p role="status" className="text-muted-foreground text-sm">
              {blockedBy
                ? `${blockedBy} doesn't let apps read its pages, so add the details here.`
                : "Cubby couldn't read that page, so add the details here."}{" "}
              Your link is saved.{" "}
              {blockedBy && (
                <Link href="/save-to-cubby" className="text-brand underline">
                  Save from the store&apos;s page instead
                </Link>
              )}
            </p>
          )}
        </div>
      )}

      {photoNotSaved && !chosenPhoto && (
        <p role="status" className="text-muted-foreground text-sm">
          This store won&apos;t let Cubby keep its photo. You can add your own
          under Add details.
        </p>
      )}

      {!showPreview && titleField}

      <ItemTypeField
        itemTypesByCategory={itemTypesByCategory}
        categories={categories}
        value={itemTypeId}
        onChange={(id) => {
          setItemTypeId(id);
          setErrors((prev) => ({ ...prev, itemType: undefined }));
        }}
        error={errors.itemType}
        suggestions={suggestions}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>How much do you want it?</Label>
        <StarRatingInput name="interest_level" />
      </div>

      {/* Always showing: where color, size and other specifics go. */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Color, size, anything to remember"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={detailsOpen}
            aria-controls="item-details"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <ChevronDown
              className={cn(
                "transition-transform",
                detailsOpen && "rotate-180",
              )}
            />
            {detailsOpen ? "Hide details" : "Add details"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={startOver}>
            Start over
          </Button>
        </div>

        {/* Hidden, not unmounted, so these values are always submitted. */}
        <div
          id="item-details"
          hidden={!detailsOpen}
          className="flex flex-col gap-4"
        >
          {showPreview && titleField}

          <div className="flex flex-col gap-2">
            <Label htmlFor="image">Photo</Label>
            {photo && !showPreview && (
              <Image
                src={photo}
                alt=""
                width={80}
                height={80}
                unoptimized={unoptimizedPhoto}
                className="size-20 rounded-md object-cover"
              />
            )}
            <PhotoInput
              id="image"
              name="image"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setChosenPhoto(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sale_price">Sale price</Label>
              <Input
                id="sale_price"
                name="sale_price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="store_brand">Store / brand</Label>
            <Input
              id="store_brand"
              name="store_brand"
              value={storeBrand}
              onChange={(event) => setStoreBrand(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              name="link"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={link}
              aria-invalid={errors.link ? true : undefined}
              aria-describedby={errors.link ? "link-error" : undefined}
              onChange={(event) => {
                setLink(event.target.value);
                setErrors((prev) => ({ ...prev, link: undefined }));
              }}
              onBlur={() => {
                const url = normalizeProductLink(link);
                if (url) setLink(url);
              }}
            />
            {errors.link && (
              <p
                id="link-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.link}
              </p>
            )}
          </div>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      {/* Stays on screen above the phone tab bar. */}
      <div className="bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 px-4 py-3 backdrop-blur sm:bottom-0">
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={pending}
        >
          {pending ? "Adding..." : "Add item"}
        </Button>
      </div>
    </form>
  );
}
