import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe, Smartphone, Download, Upload, Clock, CheckCircle2, XCircle,
  Loader2, ArrowRight, LogOut, Plus, FileDown, X, AlertCircle, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SigningKeyGenerator from "@/components/SigningKeyGenerator";
import AdvancedSettings, { type AppSettings, defaultSettings } from "@/components/AdvancedSettings";
import BuildProgress from "@/components/BuildProgress";
import BuildLogs from "@/components/BuildLogs";
import { useBuildPolling, type BuildPhase } from "@/hooks/useBuildPolling";

type ConversionStatus = "pending" | "processing" | "complete" | "failed";

interface Conversion {
  id: string;
  url: string;
  status: ConversionStatus;
  createdAt: string;
  appName: string;
  packageName: string;
  downloadUrl?: string;
  buildId?: string;
}

const statusConfig: Record<ConversionStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pending: { icon: Clock, label: "Queued", className: "bg-warning/10 text-warning border-warning/20" },
  processing: { icon: Loader2, label: "Building", className: "bg-primary/10 text-primary border-primary/20" },
  complete: { icon: CheckCircle2, label: "Complete", className: "bg-success/10 text-success border-success/20" },
  failed: { icon: XCircle, label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const isValidUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const DashboardPage = () => {
  const [url, setUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [converting, setConverting] = useState(false);
  const [history, setHistory] = useState<Conversion[]>([]);
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const build = useBuildPolling();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserEmail(session.user.email ?? null);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
      else setUserEmail(session.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Sync build status to history
  useEffect(() => {
    if (build.buildId && (build.phase === "complete" || build.phase === "failed")) {
      setHistory((prev) =>
        prev.map((c) =>
          c.buildId === build.buildId
            ? {
                ...c,
                status: build.phase === "complete" ? "complete" as ConversionStatus : "failed" as ConversionStatus,
                downloadUrl: build.downloadUrl ?? undefined,
              }
            : c
        )
      );
      if (build.phase === "complete") {
        toast({ title: "Build complete!", description: "Your native AAB is ready to download." });
      }
      setConverting(false);
    }
  }, [build.buildId, build.phase, build.downloadUrl, toast]);

  // Auto-fill app name and package from URL
  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (urlError) setUrlError("");
    try {
      const parsed = new URL(val);
      const hostname = parsed.hostname.replace(/^www\./, "");
      const name = hostname.split(".")[0];
      if (!appName) setAppName(name.charAt(0).toUpperCase() + name.slice(1));
      if (!packageName) setPackageName(`com.droidify.${name.replace(/[^a-z0-9]/gi, "")}`);
    } catch {
      // ignore
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { setUrlError("Please enter a URL."); return; }
    if (!isValidUrl(url)) { setUrlError("Please enter a valid URL starting with http:// or https://"); return; }

    setUrlError("");
    setConverting(true);

    const hostname = new URL(url).hostname;
    const finalAppName = appName || hostname.replace(/^www\./, "").split(".")[0];
    const finalPackage = packageName || `com.droidify.${hostname.replace(/[^a-z0-9.]/gi, "")}`;

    const newConversion: Conversion = {
      id: Date.now().toString(),
      url,
      status: "processing",
      createdAt: new Date().toISOString().split("T")[0],
      appName: finalAppName,
      packageName: finalPackage,
    };

    setHistory((prev) => [newConversion, ...prev]);

    const buildId = await build.startBuild({
      url,
      appName: finalAppName,
      packageName: finalPackage,
      iconUrl: iconUrl || undefined,
      settings: appSettings,
    });

    if (buildId) {
      setHistory((prev) =>
        prev.map((c) => (c.id === newConversion.id ? { ...c, buildId } : c))
      );
    } else {
      setHistory((prev) =>
        prev.map((c) => (c.id === newConversion.id ? { ...c, status: "failed" as ConversionStatus } : c))
      );
      setConverting(false);
    }
  };

  const handleDownload = (conv: Conversion) => {
    if (conv.downloadUrl) {
      window.open(conv.downloadUrl, "_blank");
      toast({ title: "Downloading...", description: "Your native AAB file is downloading." });
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".keystore") && !file.name.endsWith(".jks")) {
      toast({ title: "Invalid file", description: "Please upload a .keystore or .jks file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Keystore file must be under 10MB.", variant: "destructive" });
      return;
    }
    setKeystoreFile(file);
    toast({ title: "Keystore uploaded", description: `${file.name} selected for signing.` });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => { setDragOver(false); }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been logged out." });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-heading text-xl font-bold text-gradient">Droidify</Link>
        <div className="flex items-center gap-4">
          {userEmail && <span className="text-sm text-muted-foreground font-body hidden sm:block">{userEmail}</span>}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-3xl font-bold">Native App Builder</h1>
          <p className="text-muted-foreground font-body mt-1">
            Build Play Store–ready native Android apps with Capacitor. Supports AdMob, billing, push notifications.
          </p>
        </motion.div>

        {/* Build Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">New Build</h2>
              <p className="text-xs text-muted-foreground">Native Capacitor build via Codemagic CI/CD</p>
            </div>
          </div>

          <form onSubmit={handleConvert} className="space-y-6">
            {/* URL */}
            <div className="space-y-2">
              <Label className="font-body text-sm">Web App URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://your-webapp.com"
                  className={`pl-10 bg-muted border-border h-12 ${urlError ? "border-destructive" : ""}`}
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  required
                  disabled={converting}
                />
              </div>
              {urlError && (
                <p className="text-sm text-destructive flex items-center gap-1 font-body">
                  <AlertCircle className="h-3.5 w-3.5" /> {urlError}
                </p>
              )}
            </div>

            {/* App Name & Package */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body text-sm">App Name</Label>
                <Input
                  placeholder="My App"
                  className="bg-muted border-border h-12"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  disabled={converting}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm">Package Name</Label>
                <Input
                  placeholder="com.example.myapp"
                  className="bg-muted border-border h-12 font-mono text-sm"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  disabled={converting}
                />
              </div>
            </div>

            {/* Icon URL */}
            <div className="space-y-2">
              <Label className="font-body text-sm">App Icon URL (optional)</Label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://example.com/icon-512x512.png"
                  className="pl-10 bg-muted border-border h-12"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  disabled={converting}
                />
              </div>
              <p className="text-xs text-muted-foreground">512×512 PNG recommended. Leave blank to use favicon.</p>
            </div>

            {/* Build Output Info */}
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-sm font-semibold font-body">Native Capacitor Build</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generates a real native Android app with Gradle — not a TWA wrapper. Includes native splash screen, 
                offline fallback, lifecycle handling, and plugin architecture for AdMob, billing & FCM.
              </p>
            </div>

            {/* Keystore Upload */}
            <div className="space-y-2">
              <Label className="font-body text-sm">Signing Keystore (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".keystore,.jks"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
              />
              {keystoreFile ? (
                <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold font-body">{keystoreFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(keystoreFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setKeystoreFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => !converting && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:border-primary/30"
                  } ${converting ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-body">
                    Drop your .keystore file here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Uses default debug keystore if not provided</p>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <AdvancedSettings settings={appSettings} onChange={setAppSettings} disabled={converting} />

            <Button variant="hero" size="lg" className="w-full" disabled={converting}>
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building Native App...
                </>
              ) : (
                <>
                  Build Native APK + AAB
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Build Progress & Logs */}
        {build.phase !== "idle" && (
          <div className="space-y-4">
            <BuildProgress phase={build.phase} duration={build.duration} />
            <BuildLogs logs={build.logs} />
            {build.phase === "complete" && (build.aabUrl || build.apkUrl) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold font-body">Build Complete — Play Store Ready</p>
                    <p className="text-xs text-muted-foreground">Download your signed native Android files below</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {build.aabUrl && (
                    <Button onClick={() => window.open(build.aabUrl!, "_blank")}>
                      <Download className="h-4 w-4 mr-2" /> Download AAB (Play Store)
                    </Button>
                  )}
                  {build.apkUrl && (
                    <Button variant="outline" onClick={() => window.open(build.apkUrl!, "_blank")}>
                      <Download className="h-4 w-4 mr-2" /> Download APK (Direct Install)
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Signing Key Generator */}
        <SigningKeyGenerator />

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-semibold">Build History</h2>
            {history.length > 0 && (
              <span className="text-sm text-muted-foreground font-body ml-auto">{history.length} builds</span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center">
              <Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-body">No builds yet. Enter a URL above to build your first native app.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {history.map((conv, i) => {
                  const statusInfo = statusConfig[conv.status];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <motion.div key={conv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }} className="glass rounded-xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm font-body">{conv.appName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[350px]">{conv.packageName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className={`${statusInfo.className} flex items-center gap-1`}>
                          <StatusIcon className={`h-3 w-3 ${conv.status === "processing" ? "animate-spin" : ""}`} />
                          {statusInfo.label}
                        </Badge>
                        {conv.status === "complete" && conv.downloadUrl && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(conv)}
                            title="Download AAB">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
