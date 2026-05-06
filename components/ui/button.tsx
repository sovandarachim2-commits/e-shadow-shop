import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "dark" | "light" | "outline" | "ghost";
};

const variants = {
  dark: "bg-[var(--navy)] text-white shadow-[0_16px_28px_rgba(46,79,195,0.22)] hover:bg-[var(--navy-dark)]",
  light: "bg-white text-[var(--foreground)] hover:bg-[var(--surface-tint)]",
  outline: "border border-[var(--champagne)] bg-white/70 text-[var(--foreground)] hover:bg-[var(--surface-tint)]",
  ghost: "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900"
};

export function Button({ className = "", variant = "dark", ...props }: ButtonProps) {
  return (
    <button
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  className = "",
  variant = "dark"
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variants;
}) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold transition ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
