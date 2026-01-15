import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth/verify";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const baseUrl = process.env.API_BASE_URL;
  const token = getAuthToken();

  if (!baseUrl) {
    return NextResponse.json({ error: "missing_api_base_url" }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/invites/${params.id}/resend`, {
      method: "POST",
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
