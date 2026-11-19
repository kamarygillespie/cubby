// Re-mounts on every page change. Each page and its loading placeholder fades
// in as it arrives, instead of snapping into place (KAM-63).
export default function Template({ children }: LayoutProps<"/">) {
  return (
    <div className="*:animate-page-in contents motion-reduce:*:animate-none">
      {children}
    </div>
  );
}
