import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Inline "couldn't load" notice — distinguishes a failed fetch from a genuinely empty list. */
export function ErrorState({ message = "Couldn't load this data.", onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
