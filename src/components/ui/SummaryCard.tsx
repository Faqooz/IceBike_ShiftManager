interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "green" | "yellow" | "blue" | "red";
}

const accentMap = {
  default: "text-ink",
  green: "text-emerald-400",
  yellow: "text-yellow-400",
  blue: "text-sky-400",
  red: "text-red-400",
};

export function SummaryCard({
  label,
  value,
  sub,
  accent = "default",
}: SummaryCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-3xl font-bold ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
