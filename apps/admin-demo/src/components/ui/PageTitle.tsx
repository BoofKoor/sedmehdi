import { useEffect, useRef, type ReactNode } from "react";

import { takeTitleFocus } from "@/lib/focusTitle";

/** The page's heading. Focusable (not tabbable), so a route change can land the reader on it. */
export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => takeTitleFocus(ref.current), []);
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 ref={ref} tabIndex={-1} className="text-[1.35rem] font-bold leading-tight tracking-[-0.01em] text-content outline-none">
          {title}
        </h1>
        {sub && <p className="mt-0.5 text-xs text-content-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
