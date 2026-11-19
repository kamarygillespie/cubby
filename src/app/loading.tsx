// Shown instantly while a page's server data loads (navigations between
// tabs, lists, etc.). A generic skeleton of the app's photo grid.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 p-4"
    >
      <div className="flex h-8 items-center justify-between gap-2">
        <div className="bg-muted h-5 w-20 animate-pulse rounded-md" />
        <div className="bg-muted h-8 w-28 animate-pulse rounded-lg" />
      </div>
      <div className="bg-muted h-7 w-64 animate-pulse rounded-lg" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="bg-muted/60 aspect-square w-full animate-pulse rounded-2xl" />
            <div className="bg-muted/60 h-4 w-3/4 animate-pulse rounded" />
            <div className="bg-muted/60 h-4 w-1/3 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
