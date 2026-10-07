import { clsx } from "clsx";

import type { Brand } from "@/profiles";

/** The business's mark, in its brand colour unless the caller sets one. */
export function BrandMark({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable="false" className={clsx("shrink-0 fill-current", className)}>
      <path d={brand.mark} fillRule="evenodd" />
    </svg>
  );
}

/** The mark on a brand tile: the picker's and the rail's identity, white on the hero gradient. */
export function BrandTile({ brand, className }: { brand: Brand; className?: string }) {
  return (
    <span aria-hidden className={clsx("grid shrink-0 place-items-center rounded-[11px] bg-hero text-white shadow-hero", className ?? "h-9 w-9")}>
      <BrandMark brand={brand} className="h-[58%] w-[58%]" />
    </span>
  );
}

/** The same mark as a favicon: an SVG data URI, so the tab icon changes with the business. */
export function brandFavicon(brand: Brand, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><path transform="translate(4.8 4.8) scale(.7)" fill="#fff" fill-rule="evenodd" d="${brand.mark}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
