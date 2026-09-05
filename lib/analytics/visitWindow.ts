const VISIT_WINDOW_MS = 30 * 60 * 1000;

export function getVisitWindowStart(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / VISIT_WINDOW_MS) * VISIT_WINDOW_MS,
  );
}
