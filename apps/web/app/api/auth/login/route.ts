import crypto from "crypto";
import { NextResponse } from "next/server";

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(input: string) {
  const hash = crypto.createHash("sha256").update(input).digest();
  return base64UrlEncode(hash);
}

export async function GET(request: Request) {
  const domain = process.env.COGNITO_DOMAIN;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const redirectUri = process.env.COGNITO_REDIRECT_URI;
  const prompt = process.env.COGNITO_PROMPT;

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

  const url = new URL(request.url);

  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = sha256Base64Url(codeVerifier);
  const state = base64UrlEncode(crypto.randomBytes(16));

  const authorizeUrl = new URL(`https://${domain}/oauth2/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("state", state);

  if (prompt) {
    authorizeUrl.searchParams.set("prompt", prompt);
  }

  const res = NextResponse.redirect(authorizeUrl);

  res.cookies.set("pkce", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: url.protocol === "https:",
    maxAge: 10 * 60,
  });

  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: url.protocol === "https:",
    maxAge: 10 * 60,
  });

  return res;
}
