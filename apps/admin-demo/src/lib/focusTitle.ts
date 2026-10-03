/**
 * Moving focus to a new page's heading after navigation, so a keyboard or screen-reader user lands
 * on the page they asked for instead of staying on the link that took them there. The heading
 * claims the focus when it MOUNTS, because a lazily loaded page renders its heading only after its
 * chunk arrives, well after the navigation itself.
 */
let pending = false;

export function requestTitleFocus(): void {
  pending = true;
}

export function takeTitleFocus(el: HTMLElement | null): void {
  if (!pending || !el) return;
  pending = false;
  el.focus({ preventScroll: true });
}
