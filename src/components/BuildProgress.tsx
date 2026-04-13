import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Clock, Cpu, type LucideIcon } from "lucide-react";
import type { BuildPhase } from "@/hooks/useBuildPolling";

const phaseConfig: Record<BuildPhase, { icon: LucideIcon; label: string; color: string; animate?: boolean }> = {
  idle: { icon: Clock, label: "Ready", color: "text-muted-foreground" },
  queued: { icon: Clock, label: "Queued — waiting for build server...", color: "text-warning", animate: true },
  building: { icon: Cpu, label: "Building native Android project...", color: "text-primary", animate: true },
  complete: { icon: CheckCircle2, label: "Build complete!", color: "text-success" },
  failed: { icon: XCircle, label: "Build failed", color: "text-destructive" },
};

interface BuildProgressProps {
  phase: BuildPhase;
  duration?: number | null;
}

const BuildProgress = ({ phase, duration }: BuildProgressProps) => {
  if (phase === "idle") return null;

  const config = phaseConfig[phase];
  const Icon = config.icon;

  const steps: BuildPhase[] = ["queued", "building", "complete"];
  const currentStep = steps.indexOf(phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-5 w-5 ${config.color} ${config.animate ? "animate-pulse" : ""}`} />
        <span className={`text-sm font-semibold font-body ${config.color}`}>{config.label}</span>
        {duration && (
          <span className="text-xs text-muted-foreground ml-auto">{Math.round(duration)}s</span>
        )}
      </div>

      {phase !== "failed" && (
        <div className="flex gap-2">
          {steps.map((step, i) => (
            <div key={step} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= currentStep
                    ? phase === "complete"
                      ? "bg-success"
                      : "bg-primary"
                    : "bg-muted"
                }`}
              />
              <p className="text-[10px] text-muted-foreground mt-1 capitalize">{step}</p>
            </div>
          ))}
        </div>
      )}

      {(phase === "queued" || phase === "building") && (
        <div className="flex items-center gap-2 mt-3">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {phase === "queued" ? "Estimated: 3–8 minutes" : "Compiling with Gradle..."}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default BuildProgress;
