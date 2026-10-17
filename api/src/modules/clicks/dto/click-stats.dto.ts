/**
 * Aggregated click statistics for a single link.
 * Returned by GET /api/links/:code/stats.
 */
export class ClickStatsDto {
  /** The public slug / code of the link. */
  code!: string;

  /** Total number of recorded clicks. */
  total!: number;

  /** Clicks grouped by calendar day (UTC), ordered chronologically. */
  dailyClicks!: Array<{
    /** ISO date string: 'YYYY-MM-DD'. */
    day: string;
    /** Number of clicks on that day. */
    count: number;
  }>;
}
