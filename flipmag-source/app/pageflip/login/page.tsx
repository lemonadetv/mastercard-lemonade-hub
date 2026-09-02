import { FlipmagLoginForm } from "../../flipmag/login/login-form";

export const metadata = { title: "Page Flip Builder Login | Mastercard" };

export default async function PageFlipLoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const requested = (await searchParams).returnTo ?? "/pageflip/admin";
  const returnTo = requested.startsWith("/pageflip/") ? requested : "/pageflip/admin";
  return <main className="flipmag-login-shell"><FlipmagLoginForm returnTo={returnTo} /></main>;
}
