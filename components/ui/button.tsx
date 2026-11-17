import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "brand" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-black",
  brand: "bg-brand text-cream hover:bg-brand-dark",
  outline: "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-cream",
  ghost: "bg-transparent text-ink hover:bg-sand",
  danger: "bg-danger text-white hover:brightness-90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-8 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
