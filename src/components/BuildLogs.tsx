import { motion } from "framer-motion";
import { Terminal, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useRef, useEffect } from "react";

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
  success: { icon: CheckCircle2, className: "text-green-400" },
  error: { icon: XCircle, className: "text-destructive" },
  warning: { icon: AlertCircle, className: "text-warning" },
};

const BuildLogs = ({ logs }: BuildLogsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Terminal className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold font-body">Build Logs</span>
        <span className="text-xs text-muted-foreground ml-auto">{logs.length} entries</span>
      </div>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 space-y-1 bg-black/20">
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
};

export default BuildLogs;
