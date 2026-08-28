import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/ui";

type WizardStepBuildProps = {
  isBuilding: boolean;
  buildError: string | null;
  buildStepMsg: string;
  buildLogs: string[];
};

/** Step 4: live build progress screen. */
export function WizardStepBuild({
  isBuilding,
  buildError,
  buildStepMsg,
  buildLogs,
}: WizardStepBuildProps) {
  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        {isBuilding ? (
          <div className="relative size-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : buildError ? (
          <div className="size-14 rounded-full bg-error/15 border border-error/30 flex items-center justify-center text-error">
            <AlertCircle size={28} />
          </div>
        ) : (
          <div className="size-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success">
            <CheckCircle2 size={28} />
          </div>
        )}

        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {isBuilding
              ? "Generating Your Game Playground..."
              : buildError
                ? "Project Creation Failed"
                : "Playground Created Successfully!"}
          </h3>
          <p className="text-xs text-text-muted mt-1">{buildStepMsg}</p>
        </div>
      </div>

      {/* Terminal Log Box */}
      <div className="rounded-xl border border-border-strong bg-black/60 p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-1 text-text-secondary">
        {buildLogs.map((log, index) => (
          <div
            key={index}
            className={cn(
              "leading-relaxed",
              log.startsWith("✔")
                ? "text-success font-semibold"
                : log.startsWith("✖")
                  ? "text-error font-semibold"
                  : log.startsWith("⚠")
                    ? "text-warning"
                    : "text-text-secondary"
            )}
          >
            {log}
          </div>
        ))}
      </div>

      {buildError && (
        <div className="p-3 rounded-lg border border-error/30 bg-error/10 text-xs text-error">
          {buildError}
        </div>
      )}
    </div>
  );
}
