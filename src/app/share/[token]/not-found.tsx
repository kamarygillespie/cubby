// Visitors here are usually signed out and may not use Cubby at all, so no
// "back to your items" link — just explain what likely happened.
export default function SharedWishlistNotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-semibold">
        This wishlist link doesn&apos;t work
      </h1>
      <p className="text-muted-foreground text-sm">
        The list may have been deleted, or the link was cut off when it was
        copied. Ask the person who shared it to send it again.
      </p>
    </div>
  );
}
