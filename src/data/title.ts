/**
 * A project title split before its last word, so that word and the arrow after it can wrap as one box (`.tw`).
 * "Spindle Admin Kit" gives ["Spindle Admin ", "Kit"]; a one-word title is all last word.
 */
export function lastWord(title: string): [string, string] {
  const i = title.lastIndexOf(' ');
  return i < 0 ? ['', title] : [title.slice(0, i + 1), title.slice(i + 1)];
}
