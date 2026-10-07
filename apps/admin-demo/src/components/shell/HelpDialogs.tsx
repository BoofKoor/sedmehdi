import { t, tl } from "@/i18n";
import { useAppState } from "@/state/AppState";

import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      onClose={onClose}
      title={t("about.title")}
      testId="about"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t("about.close")}
        </Button>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-content-muted">
        <p className="text-content">{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
      </div>
    </Dialog>
  );
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1" dir="ltr">
      {keys.map((k, i) =>
        k === "then" ? (
          <span key={i} className="px-0.5 text-[11px] text-content-muted">
            {t("keys.then")}
          </span>
        ) : (
          <kbd key={i} className="min-w-[1.6rem] rounded-md border border-line-control bg-surface-sunken px-1.5 py-0.5 text-center font-sans text-xs font-semibold text-content">
            {k}
          </kbd>
        ),
      )}
    </span>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { profile } = useAppState();
  const [e0, e1] = profile.entities;
  const rows: [string[], string][] = [
    [["Ctrl", "K"], t("keys.palette")],
    [["?"], t("keys.help")],
    [["g", "then", "d"], t("keys.goDashboard")],
    [["g", "then", "1"], t("keys.goTable1", { page: tl(e0.label) })],
    [["g", "then", "2"], t("keys.goTable1", { page: tl(e1.label) })],
    [["g", "then", "h"], t("keys.goHealth", { page: tl(profile.copy.health) })],
    [["[", "]"], t("keys.range")],
    [["b"], t("keys.business")],
    [["t"], t("keys.theme")],
    [["l"], t("keys.language")],
    [["/"], t("keys.search")],
  ];
  return (
    <Dialog onClose={onClose} title={t("keys.title")} sub={t("keys.note")} testId="shortcuts">
      <dl className="divide-y divide-line">
        {rows.map(([keys, what]) => (
          <div key={what + keys.join()} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-content">{what}</dt>
            <dd>
              <Keys keys={keys} />
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
