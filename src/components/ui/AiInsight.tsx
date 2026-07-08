import { Sparkles } from "lucide-react";

// Reusable AI-generated insight panel — gold-accented to match the Horus brand.
export function AiInsight({ text, title = "AI Insight", className = "" }: { text: string; title?: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.07] p-4 ${className}`}>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
        <Sparkles size={14} /> {title}
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-dim)]">{text}</p>
    </div>
  );
}
