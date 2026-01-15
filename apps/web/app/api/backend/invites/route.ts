import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth/verify";

export async function GET() {
  const baseUrl = process.env.API_BASE_URL;
  const token = getAuthToken();

  if (!baseUrl) {
    return NextResponse.json([]);
  }

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/invites`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  const token = getAuthToken();

  if (!baseUrl) {
    return NextResponse.json({ error: "missing_api_base_url" }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/invites`, {
      method: "POST",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
  }
}
