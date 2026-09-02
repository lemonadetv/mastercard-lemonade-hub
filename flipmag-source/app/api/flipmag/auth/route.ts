import {
  createFlipmagSessionToken,
  FLIPMAG_SESSION_COOKIE,
  isConfiguredPassword,
} from "@/lib/flipmag-auth";

export async function POST(request: Request) {
  const { password } = await request.json() as { password?: string };
  if (!isConfiguredPassword(password ?? "")) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }
  const response = Response.json({ ok: true });
  response.headers.append(
    "set-cookie",
    `${FLIPMAG_SESSION_COOKIE}=${await createFlipmagSessionToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`,
  );
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append(
    "set-cookie",
    `${FLIPMAG_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return response;
}

