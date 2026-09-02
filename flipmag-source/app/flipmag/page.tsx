import { BookOpen } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Page Flip Builder | Mastercard",
  description: "Interactive flip magazines published by Lemonade for Mastercard.",
};

export default function FlipmagPage() {
  return (
    <main className="builder-shell">
      <header className="builder-topbar">
        <div className="builder-brand"><img src="/assets/mastercard-symbol.png" alt="Mastercard" /><span>Page Flip Builder</span></div>
      </header>
      <section className="builder-hero">
        <div><span className="eyebrow"><BookOpen /> Published magazines</span><h1>Business Intelligence Journal</h1><p>Explore the 2026 Agentic AI edition.</p></div>
      </section>
      <section className="project-section">
        <div className="project-grid public-project-grid">
          <article className="project-card">
            <Link className="project-open" href="/pageflip/bi-journal-2026">
              <div className="project-cover"><img src="/pages/page-01.webp" alt="Business Intelligence Journal / Agentic AI" /><span className="status-pill status-published">Published</span></div>
              <div className="project-copy"><h3>Business Intelligence Journal / Agentic AI</h3><p>2026 edition</p><div><span>16 pages</span><span>Interactive magazine</span></div></div>
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
