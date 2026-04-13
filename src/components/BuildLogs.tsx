import { motion } from "framer-motion";
import { Terminal, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { forwardRef, useEffect, useRef } from "react";

interface BuildLog {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface BuildLogsProps {
  logs: BuildLog[];
}

const typeConfig = {
  info: { icon: Info, className: "text-muted-foreground" },
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: XCircle, className: "text-destructive" },
  warning: { icon: AlertCircle, className: "text-warning" },
};

const BuildLogs = forwardRef<HTMLDivElement, BuildLogsProps>(({ logs }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Terminal className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold font-body">Build Logs</span>
        <span className="text-xs text-muted-foreground ml-auto">{logs.length} entries</span>
      </div>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-1 bg-muted/40 p-4">
        {logs.map((log, i) => {
          const config = typeConfig[log.type];
          const Icon = config.icon;
          return (
            <div key={i} className={`flex items-start gap-2 text-xs font-mono ${config.className}`}>
              <Icon className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="text-muted-foreground/60">[{log.time}]</span>
              <span>{log.message}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

BuildLogs.displayName = "BuildLogs";

export default BuildLogs;
