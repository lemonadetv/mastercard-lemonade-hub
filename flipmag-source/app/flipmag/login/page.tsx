import { FlipmagLoginForm } from "./login-form";

export const metadata = { title: "Page Flip Builder Login | Mastercard" };

export default async function FlipmagLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const requested = (await searchParams).returnTo ?? "/pageflip/admin";
  const returnTo = requested.startsWith("/pageflip/") || requested.startsWith("/flipmag/") ? requested : "/pageflip/admin";
  return <main className="flipmag-login-shell"><FlipmagLoginForm returnTo={returnTo} /></main>;
}
