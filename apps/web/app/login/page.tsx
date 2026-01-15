import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-neutral-600">
          This is a placeholder login screen.
        </p>
        <div className="flex gap-3">
          <Link
            className="rounded bg-black px-4 py-2 text-white"
            href="/api/auth/login"
          >
            Continue
          </Link>
          <Link className="rounded border px-4 py-2" href="/">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
