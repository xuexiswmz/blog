export default function ReadingProgressRing({ progress }: { progress: number }) {
  const value = Math.min(100, Math.max(0, Math.round(progress)));
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <svg
      role="progressbar"
      aria-label="阅读进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      viewBox="0 0 24 24"
      className="size-5 shrink-0 -rotate-90"
    >
      <circle
        data-ring-part="track"
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-slate-200 dark:text-border"
      />
      <circle
        data-ring-part="progress"
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-link transition-[stroke-dashoffset] duration-150 motion-reduce:transition-none"
      />
    </svg>
  );
}
