import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-mono text-7xl font-bold text-lime mb-4">404</div>
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        If you typed the URL manually, please double-check it.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
        <Link href="/#/dashboard">
          <Button variant="outline">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
