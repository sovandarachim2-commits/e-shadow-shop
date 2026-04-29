import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "dark" | "light" | "outline" | "ghost";
};

const variants = {
  dark: "bg-[#082b4c] text-white shadow-sm hover:bg-[#0d3a64]",
  light: "bg-white text-[#082b4c] hover:bg-[#fff8f3]",
  outline: "border border-[#f3c7b8] bg-white/55 text-[#082b4c] hover:bg-[#fff8f3]",
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
