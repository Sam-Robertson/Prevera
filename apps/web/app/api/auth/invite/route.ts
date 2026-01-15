import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  const redirectTo = new URL("/api/auth/login", url);
  const res = NextResponse.redirect(redirectTo);

  if (token) {
    res.cookies.set("invite_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: url.protocol === "https:",
      maxAge: 10 * 60,
    });
  }

  return res;
}
