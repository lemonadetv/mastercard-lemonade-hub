import { FlipmagLoginForm } from "./login-form";

export const metadata = { title: "Page Flip Builder Login | Mastercard" };

export default async function FlipmagLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const requested = (await searchParams).returnTo ?? "/flipmag/admin";
  const returnTo = requested.startsWith("/flipmag/") ? requested : "/flipmag/admin";
  return <main className="flipmag-login-shell"><FlipmagLoginForm returnTo={returnTo} /></main>;
}

