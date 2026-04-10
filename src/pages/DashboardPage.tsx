import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Globe,
  Smartphone,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  LogOut,
  Plus,
  Key,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type ConversionStatus = "pending" | "processing" | "complete" | "failed";
type OutputFormat = "apk" | "aab";

interface Conversion {
  id: string;
  url: string;
  format: OutputFormat;
  status: ConversionStatus;
  createdAt: string;
  appName: string;
}

const mockHistory: Conversion[] = [
  {
    id: "1",
    url: "https://my-portfolio.dev",
    format: "apk",
    status: "complete",
    createdAt: "2026-04-09",
    appName: "My Portfolio",
  },
  {
    id: "2",
    url: "https://todo-app.vercel.app",
    format: "aab",
    status: "complete",
    createdAt: "2026-04-08",
    appName: "Todo App",
  },
  {
    id: "3",
    url: "https://shop.example.com",
    format: "apk",
    status: "failed",
    createdAt: "2026-04-07",
    appName: "E-Shop",
  },
];

const statusConfig: Record<ConversionStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  processing: { icon: Loader2, label: "Processing", className: "bg-primary/10 text-primary border-primary/20" },
  complete: { icon: CheckCircle2, label: "Complete", className: "bg-success/10 text-success border-success/20" },
  failed: { icon: XCircle, label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DashboardPage = () => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("apk");
  const [converting, setConverting] = useState(false);
  const [history, setHistory] = useState<Conversion[]>(mockHistory);
  const { toast } = useToast();

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setConverting(true);
    const newConversion: Conversion = {
      id: Date.now().toString(),
      url,
      format,
      status: "processing",
      createdAt: new Date().toISOString().split("T")[0],
      appName: new URL(url).hostname,
    };

    setHistory((prev) => [newConversion, ...prev]);

    // Simulate conversion
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((c) => (c.id === newConversion.id ? { ...c, status: "complete" as ConversionStatus } : c))
      );
      setConverting(false);
      setUrl("");
      toast({ title: "Conversion complete!", description: `Your ${format.toUpperCase()} is ready to download.` });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl font-bold text-gradient">Droidify</Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Link>
        </Button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground font-body mt-1">Convert web apps to native Android packages.</p>
        </motion.div>

        {/* Conversion Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8 mb-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-semibold">New Conversion</h2>
          </div>

          <form onSubmit={handleConvert} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-body text-sm">Web App URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://your-webapp.com"
                  className="pl-10 bg-muted border-border h-12"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={converting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body text-sm">Output Format</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("apk")}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    format === "apk"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <Smartphone className={`h-5 w-5 ${format === "apk" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${format === "apk" ? "text-foreground" : "text-muted-foreground"}`}>
                      APK
                    </p>
                    <p className="text-xs text-muted-foreground">Direct install</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("aab")}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    format === "aab"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <Download className={`h-5 w-5 ${format === "aab" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${format === "aab" ? "text-foreground" : "text-muted-foreground"}`}>
                      AAB
                    </p>
                    <p className="text-xs text-muted-foreground">Play Store</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body text-sm">Signing Key (optional)</Label>
              <div className="border border-dashed border-border rounded-xl p-6 text-center bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-body">
                  Drop your .keystore file here or{" "}
                  <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Leave empty to use debug signing key
                </p>
              </div>
            </div>

            <Button variant="hero" size="lg" className="w-full" disabled={converting}>
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  Start Conversion
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-semibold">Conversion History</h2>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {history.map((conv, i) => {
                const statusInfo = statusConfig[conv.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass rounded-xl p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm font-body">{conv.appName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[350px]">
                          {conv.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="uppercase text-xs font-mono">
                        {conv.format}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${statusInfo.className} flex items-center gap-1`}
                      >
                        <StatusIcon className={`h-3 w-3 ${conv.status === "processing" ? "animate-spin" : ""}`} />
                        {statusInfo.label}
                      </Badge>
                      {conv.status === "complete" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
