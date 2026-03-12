interface Props {
  label: string;
  value: number;
  max?: number;
}

const ConditionBar = ({ label, value, max = 10 }: Props) => {
  const percent = (value / max) * 100;
  const color =
    percent >= 70 ? "bg-success" : percent >= 40 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ConditionBar;
