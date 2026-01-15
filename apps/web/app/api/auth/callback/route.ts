import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const state = url.searchParams.get("state");

  const domain = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  const redirectUri = process.env.COGNITO_REDIRECT_URI;

  const redirectTo = new URL("/dashboard", url);
  const res = NextResponse.redirect(redirectTo);

  const secure = url.protocol === "https:";

  if (token && process.env.ALLOW_INSECURE_DEV_TOKEN === "true") {
    res.cookies.set("auth", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
    });
    return res;
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", url));
  }

  if (!domain || !clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: "missing_cognito_env",
        missing: {
          COGNITO_DOMAIN: !domain,
          COGNITO_CLIENT_ID: !clientId,
          COGNITO_REDIRECT_URI: !redirectUri,
        },
      },
      { status: 500 },
    );
  }

  const codeVerifier = cookies().get("pkce")?.value ?? null;
  const expectedState = cookies().get("oauth_state")?.value ?? null;

  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/login", url));
  }

  if (!expectedState || !state || expectedState !== state) {
    return NextResponse.redirect(new URL("/login", url));
  }

  const tokenUrl = `https://${domain}/oauth2/token`;
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("code_verifier", codeVerifier);

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  const upstream = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error("COGNITO TOKEN EXCHANGE FAILED", { status: upstream.status, text });
    return NextResponse.redirect(new URL("/login", url));
  }

  const data = (await upstream.json()) as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  const accessToken = data.access_token;
  const idToken = data.id_token;
  const selected = idToken ?? accessToken;

  if (!selected) {
    console.error("COGNITO TOKEN EXCHANGE MISSING TOKENS", data);
    return NextResponse.redirect(new URL("/login", url));
  }

  res.cookies.set("auth", selected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: typeof data.expires_in === "number" ? data.expires_in : undefined,
  });

  const inviteToken = cookies().get("invite_token")?.value ?? null;

  const apiBaseUrl = process.env.API_BASE_URL;
  if (apiBaseUrl) {
    try {
      const ensure = await fetch(`${apiBaseUrl}/auth/ensure-user`, {
        method: "POST",
        headers: { authorization: `Bearer ${selected}` },
        cache: "no-store",
      });

      if (!ensure.ok) {
        const text = await ensure.text();
        console.error("ENSURE USER FAILED", { status: ensure.status, text });
      }

      if (inviteToken) {
        const accept = await fetch(`${apiBaseUrl}/invites/accept-auth`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${selected}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ token: inviteToken }),
          cache: "no-store",
        });

        if (!accept.ok) {
          const text = await accept.text();
          console.error("INVITE ACCEPT FAILED", { status: accept.status, text });
        }
      }
    } catch (e: any) {
      console.error("ENSURE USER ERROR", e?.message ?? String(e));
    }
  }

  res.cookies.set("pkce", "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });
  res.cookies.set("oauth_state", "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });
  res.cookies.set("invite_token", "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 });

  return res;
}
