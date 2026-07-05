import { icons, type LucideProps } from "lucide-react";

// Render a lucide icon by its PascalCase name (falls back to a neutral dot).
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = icons[name as keyof typeof icons] ?? icons.Circle;
  return <Cmp {...props} />;
}
