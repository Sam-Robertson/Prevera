"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
  return (
    <Link
      className={active ? "font-semibold underline" : "hover:underline"}
      href={href}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link className="font-semibold" href="/dashboard">
          Authora
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <nav className="flex items-center gap-4 text-sm">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/patients">Patients</NavLink>
            <NavLink href="/admin/users-access">Admin</NavLink>
          </nav>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold"
              onClick={() => setOpen((v) => !v)}
              aria-label="Account"
            >
              A
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-44 rounded border bg-white shadow">
                <Link
                  className="block px-3 py-2 text-sm hover:bg-neutral-50"
                  href="/account"
                  onClick={() => setOpen(false)}
                >
                  Account
                </Link>
                <div className="border-t" />
                <Link
                  className="block px-3 py-2 text-sm hover:bg-neutral-50"
                  href="/api/auth/logout"
                  onClick={() => setOpen(false)}
                >
                  Logout
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
