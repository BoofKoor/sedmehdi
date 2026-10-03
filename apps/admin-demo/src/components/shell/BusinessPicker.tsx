/**
 * The Business picker: the demo's whole point in one control. Five businesses, one admin kit; the
 * brand, navigation, metrics and copy all switch with it.
 *
 * A listbox popup: the button says which business is showing and that it can change, the list
 * takes focus on its selected option, arrows move, Enter or Space picks, Esc closes back to the
 * button. Each option shows the business's own mark and colour, which is the visual promise of
 * what picking it will do.
 */
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { t, tl } from "@/i18n";
import { BRANDS, PROFILE_IDS, type ProfileId } from "@/profiles";
import { useAppState } from "@/state/AppState";

import { Popover } from "../ui/Popover";
import { BrandMark, BrandTile } from "./BrandMark";

export function BusinessPicker({ open, setOpen, onPick }: { open: boolean; setOpen: (v: boolean) => void; onPick: (id: ProfileId) => void }) {
  const { profile } = useAppState();
  const brand = profile.brand;
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const base = useId();
  const [active, setActive] = useState<number>(PROFILE_IDS.indexOf(brand.id));

  useEffect(() => {
    if (!open) return;
    setActive(PROFILE_IDS.indexOf(brand.id));
    requestAnimationFrame(() => list.current?.focus());
  }, [open, brand.id]);

  const choose = (i: number) => {
    setOpen(false);
    button.current?.focus();
    if (PROFILE_IDS[i] !== brand.id) onPick(PROFILE_IDS[i]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const n = PROFILE_IDS.length;
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % n);
    else if (e.key === "ArrowUp") setActive((i) => (i - 1 + n) % n);
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else return;
    e.preventDefault();
  };

  const optionId = (i: number) => `${base}-opt-${i}`;

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${base}-list` : undefined}
        aria-label={t("biz.aria", { brand: brand.name })}
        onClick={() => setOpen(!open)}
        data-testid="business-picker"
        className="group flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl py-1 pe-2 ps-1 text-start transition hover:bg-surface-hover md:pe-2.5"
      >
        <BrandTile brand={brand} className="h-9 w-9" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[0.95rem] font-bold text-content" style={{ unicodeBidi: "isolate" }}>
            {brand.name}
          </span>
          <span className="block truncate text-[11px] text-content-muted">
            <span className="hidden sm:inline">{t("biz.label")} · </span>
            {tl(brand.kind)}
          </span>
        </span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-content-muted transition", open && "rotate-180")} aria-hidden />
      </button>

      <Popover anchor={button} open={open} onClose={() => setOpen(false)} width={340}>
        <p className="px-2.5 pb-2 pt-1.5 text-xs leading-relaxed text-content-muted">{t("biz.hint")}</p>
        <ul
          ref={list}
          id={`${base}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={t("biz.list")}
          aria-activedescendant={optionId(active)}
          onKeyDown={onKeyDown}
          className="outline-none"
        >
          {PROFILE_IDS.map((id, i) => {
            const b = BRANDS[id];
            const selected = id === brand.id;
            return (
              <li
                key={id}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                data-profile-option={id}
                onClick={() => choose(i)}
                onPointerMove={() => setActive(i)}
                className={clsx(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2",
                  i === active && "bg-surface-hover ring-2 ring-inset ring-[rgb(var(--ring))]",
                )}
              >
                {/* Each business's own colour, read from its palette scope, so the option previews it. */}
                <span data-profile-scope={id} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-hero text-white">
                  <BrandMark brand={b} className="h-[58%] w-[58%]" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold text-content" style={{ unicodeBidi: "isolate" }}>
                    {b.name}
                  </span>
                  <span className="block truncate text-xs text-content-muted">{tl(b.kind)}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
