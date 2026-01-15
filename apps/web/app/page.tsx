import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">Authora</h1>
        <p className="text-sm text-neutral-600">
          Web app is running. Use the links below to navigate.
        </p>
        <div className="flex gap-3">
          <Link
            className="rounded bg-black px-4 py-2 text-white"
            href="/login"
          >
            Login
          </Link>
          <Link className="rounded border px-4 py-2" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
