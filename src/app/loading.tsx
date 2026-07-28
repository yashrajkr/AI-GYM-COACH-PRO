export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-lime/30 border-t-lime animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Loading…</p>
      </div>
    </div>
  );
}
