import { ProtectedEditor } from "@/app/admin/page";

export const dynamic = "force-dynamic";

export default function JournalAdminPage() {
  return <ProtectedEditor returnPath="/flip/bi-journal-2026/admin" />;
}
