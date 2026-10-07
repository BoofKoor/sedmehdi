/**
 * Toasts: a sentence that says what just happened. The live region is mounted once, empty, before
 * any toast exists, because a region inserted together with its text is not announced.
 *
 * Small enough to own rather than import: it follows the business palette and the reading
 * direction through the same tokens as everything else, and it knows where the phone's bottom bar is.
 */
import { clsx } from "clsx";
import { CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { t } from "@/i18n";

type Kind = "success" | "info";
interface Toast {
  id: number;
  text: string;
  kind: Kind;
}

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(Ctx);

const LIFETIME = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string, kind: Kind = "success") => {
    const id = next.current++;
    // Newest last, at most three: a burst (five quick business switches) must not wall the screen.
    setToasts((all) => [...all.filter((x) => x.text !== text), { id, text, kind }].slice(-3));
  }, []);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-5 md:end-5 md:items-end"
        data-testid="toasts"
      >
        {toasts.map((x) => (
          <ToastItem key={x.id} toast={x} onDone={() => dismiss(x.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [hover, setHover] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (hover) return;
    const id = window.setTimeout(() => doneRef.current(), LIFETIME);
    return () => window.clearTimeout(id);
  }, [hover]);
  const Icon = toast.kind === "success" ? CheckCircle2 : Info;
  return (
    <div
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-2.5 rounded-2xl bg-surface px-3.5 py-3 text-sm text-content shadow-overlay ring-1 ring-line"
    >
      <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", toast.kind === "success" ? "text-success-700" : "text-brand-700")} aria-hidden />
      <p className="min-w-0 flex-1 break-words">{toast.text}</p>
      <button
        type="button"
        onClick={onDone}
        aria-label={t("record.close")}
        className="-my-1.5 -me-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-muted transition hover:bg-surface-hover hover:text-content"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
