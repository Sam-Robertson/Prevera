import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const postLogoutRedirectUri =
    process.env.COGNITO_LOGOUT_REDIRECT_URI ?? new URL("/login", url).toString();

  const redirectTo = domain && clientId
    ? new URL(`https://${domain}/logout`)
    : new URL("/login", url);

  if (domain && clientId) {
    redirectTo.searchParams.set("client_id", clientId);
    redirectTo.searchParams.set("logout_uri", postLogoutRedirectUri);
  }

  const res = NextResponse.redirect(redirectTo);

  const secure = url.protocol === "https:";

  res.cookies.set("auth", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });

  res.cookies.set("pkce", "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });
  res.cookies.set("oauth_state", "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });

  return res;
}
