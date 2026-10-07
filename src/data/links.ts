// A project's live address, as the cards' browser frames and the case study's facts print it: the host of its own
// site, or, for a demo hosted on this site, this site's host and the path (a bare "sedmehdi.com" would name the
// portfolio, not the demo). `short`: the narrow facts column, where a demo here is just its path.
export const isLocal = (demo: string) => demo.startsWith('/');
export function demoLabel(demo: string, site: URL | undefined, short = false): string {
  if (!isLocal(demo)) return new URL(demo).hostname;
  const path = demo.replace(/\/$/, '');
  return short ? path : `${site ? site.hostname : ''}${path}`;
}
