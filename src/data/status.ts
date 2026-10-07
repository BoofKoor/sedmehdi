// Maps a project's free-text status to the light shown next to it:
// live = running for anyone to use, in production or as a live demo (green, pings like a monitored server),
// building = in development or beta (an amber ring), steady = anything else, e.g. open source (still gray dot).
// The status text is always shown too. Known statuses map by name first: matched only by pattern, "Live demo" was lit
// because it happened to contain "live", and "Delivered" would have been too.
export type StatusState = 'live' | 'building' | 'steady';
const KNOWN: Record<string, StatusState> = { 'in production': 'live', 'live demo': 'live', 'in development': 'building' };
export const statusState = (status: string): StatusState =>
  KNOWN[status.trim().toLowerCase()] ??
  (/\b(production|live)\b/i.test(status) ? 'live' : /\b(development|beta|progress|building)\b/i.test(status) ? 'building' : 'steady');
