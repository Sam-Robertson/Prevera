import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth/verify";

export async function GET() {
  const token = getAuthToken();
  return NextResponse.json({
    authenticated: Boolean(token),
    token: token ?? null,
  });
}
