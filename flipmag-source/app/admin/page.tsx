import { AdminEditor } from "./admin-editor";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function ProtectedEditor({ returnPath = "/admin" }: { returnPath?: string } = {}) {
  const user = await requireChatGPTUser(returnPath);
  const adminEmail = (process.env.ADMIN_EMAIL ?? "rhhellbrugge@gmail.com").toLowerCase();
  if (user.email.toLowerCase() !== adminEmail) {
    return (
      <main className="admin-denied">
        <h1>Admin access required</h1>
        <p>This account can view the magazine but cannot edit its interactive links.</p>
        <Link href="/">Return to magazine</Link>
      </main>
    );
  }
  return <AdminEditor userName={user.displayName} />;
}

export default function AdminPage() {
  return <ProtectedEditor />;
}
