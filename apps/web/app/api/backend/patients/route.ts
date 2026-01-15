import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth/verify";

export async function GET(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  const token = getAuthToken();

  if (!baseUrl) {
    return NextResponse.json([
      { id: "1", name: "Patient 1" },
      { id: "2", name: "Patient 2" },
    ]);
  }

  try {
    const url = new URL(request.url);
    const upstreamUrl = new URL(`${baseUrl}/patients`);
    upstreamUrl.search = url.search;

    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    const data = await upstream.text();

    return new NextResponse(data, {
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
    const upstream = await fetch(`${baseUrl}/patients`, {
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
