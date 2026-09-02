import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const FLIPMAG_SESSION_COOKIE = "flipmag_admin_session";

function configuredPassword() {
  return process.env.FLIPMAG_ADMIN_PASSWORD ?? "";
}

async function sessionToken() {
  const bytes = new TextEncoder().encode(`mastercard-flipmag:${configuredPassword()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameValue(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function isConfiguredPassword(value: string) {
  const expected = configuredPassword();
  return expected.length > 0 && sameValue(value, expected);
}

export async function createFlipmagSessionToken() {
  return sessionToken();
}

export async function isFlipmagAdminRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${FLIPMAG_SESSION_COOKIE}=([^;]+)`));
  if (!match || !configuredPassword()) return false;
  return sameValue(decodeURIComponent(match[1]), await sessionToken());
}

export async function requireFlipmagAdmin(returnTo: string) {
  const token = (await cookies()).get(FLIPMAG_SESSION_COOKIE)?.value ?? "";
  if (!configuredPassword() || !sameValue(token, await sessionToken())) {
    redirect(`/pageflip/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
}
