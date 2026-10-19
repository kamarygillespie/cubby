// Shown instantly while a page's server data loads (navigations between
// tabs, lists, etc.). A generic skeleton of the app's card layout.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="bg-muted h-5 w-40 animate-pulse rounded-md" />
        <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
      </div>
      <div className="bg-muted h-7 w-72 animate-pulse rounded-lg" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-muted/60 h-32 w-full animate-pulse rounded-xl"
        />
      ))}
    </div>
  );
}
