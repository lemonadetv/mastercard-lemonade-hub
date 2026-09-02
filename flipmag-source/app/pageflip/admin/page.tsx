import { requireFlipmagAdmin } from "@/lib/flipmag-auth";
import { FlipmagDashboard } from "../../flipmag/flipmag-dashboard";

export const metadata = {
  title: "Page Flip Builder Admin | Mastercard",
  description: "Create, enrich, version and publish interactive flip magazines.",
};

export default async function PageFlipAdminPage() {
  await requireFlipmagAdmin("/pageflip/admin");
  return <FlipmagDashboard user={{ name: "Lemonade", email: "" }} />;
}
