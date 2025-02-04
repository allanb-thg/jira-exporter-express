import { Progress } from "@/components/ui/progress";

interface ExportProgressProps {
  current: number;
  total: number;
  status: string;
}

export function ExportProgress({ current, total, status }: ExportProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress: {current}/{total} issues</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}