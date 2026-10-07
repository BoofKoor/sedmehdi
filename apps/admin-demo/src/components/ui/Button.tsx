import { clsx } from "clsx";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // `bg-btn`, not the brand ramp: the primary action is a dark fill on the light console and a
  // light one on the dark console, so it never reads as one more chart colour.
  primary: "bg-btn text-btn-ink shadow-sm hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-sunken text-content hover:bg-surface-hover",
  ghost: "text-content-muted hover:bg-surface-hover hover:text-content",
  outline: "border border-line-control bg-surface text-content hover:bg-surface-hover",
};

// Phones get a 44px box on every size; the desktop keeps the panel's denser 32/36px controls.
const SIZES: Record<Size, string> = {
  sm: "h-11 gap-1.5 px-3 text-xs md:h-8",
  md: "h-11 gap-2 px-4 text-sm md:h-9",
};
const ICON_SIZES: Record<Size, string> = {
  sm: "h-11 w-11 md:h-8 md:w-8",
  md: "h-11 w-11 md:h-9 md:w-9",
};

interface Look {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  className?: string;
}

export function buttonClass({ variant = "primary", size = "md", iconOnly = false, className }: Look) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition",
    VARIANTS[variant],
    iconOnly ? `${ICON_SIZES[size]} p-0` : SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  iconOnly,
  className,
  type = "button",
  ...rest
}: Look & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, iconOnly, className: clsx("disabled:pointer-events-none disabled:opacity-50", className) })}
      {...rest}
    />
  );
}

/** A link that looks like a button: one element and one tab stop, never `<a><button/></a>`. */
export function LinkButton({
  variant,
  size,
  iconOnly,
  className,
  children,
  ...rest
}: Look & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & { children: ReactNode }) {
  return (
    <a className={buttonClass({ variant, size, iconOnly, className })} {...rest}>
      {children}
    </a>
  );
}
