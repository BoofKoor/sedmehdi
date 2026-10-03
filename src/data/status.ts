// Maps a project's free-text status to the light shown next to it:
// live = in production (coral, pings like a monitored server), building = in development or beta (hollow ring),
// steady = anything else, e.g. open source (still gray dot). The status text is always shown too.
export type StatusState = 'live' | 'building' | 'steady';
export const statusState = (status: string): StatusState =>
  /production|live/i.test(status) ? 'live' : /development|beta|progress|building/i.test(status) ? 'building' : 'steady';
