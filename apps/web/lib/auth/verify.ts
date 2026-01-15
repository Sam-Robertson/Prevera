import { cookies } from "next/headers";

export function getAuthToken(): string | null {
  return cookies().get("auth")?.value ?? null;
}
