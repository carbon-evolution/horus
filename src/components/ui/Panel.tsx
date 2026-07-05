import Link from "next/link";

export function Panel({
  title,
  action,
  actionHref,
  className = "",
  bodyClassName = "",
  children,
}: {
  title?: string;
  action?: string;
  actionHref?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action && (
            <Link href={actionHref ?? "#"} className="text-xs text-[var(--accent)] hover:underline">
              {action}
            </Link>
          )}
        </div>
      )}
      <div className={`min-h-0 flex-1 p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
