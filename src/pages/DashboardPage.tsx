import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe, Smartphone, Download, Upload, Clock, CheckCircle2, XCircle,
  Loader2, ArrowRight, LogOut, Plus, FileDown, X, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SigningKeyGenerator from "@/components/SigningKeyGenerator";

type ConversionStatus = "pending" | "processing" | "complete" | "failed";
type OutputFormat = "apk" | "aab";

interface Conversion {
  id: string;
  url: string;
  format: OutputFormat;
  status: ConversionStatus;
  createdAt: string;
  appName: string;
  downloadUrl?: string;
}

const statusConfig: Record<ConversionStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  processing: { icon: Loader2, label: "Processing", className: "bg-primary/10 text-primary border-primary/20" },
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
  const [format, setFormat] = useState<OutputFormat>("apk");
  const [converting, setConverting] = useState(false);
  const [history, setHistory] = useState<Conversion[]>([]);
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserEmail(session.user.email ?? null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
      else setUserEmail(session.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (urlError) setUrlError("");
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError("Please enter a URL.");
      return;
    }
    if (!isValidUrl(url)) {
      setUrlError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setUrlError("");
    setConverting(true);

    const hostname = new URL(url).hostname;
    const appName = hostname.replace(/^www\./, "").replace(/\.[^.]+$/, "");
    const newConversion: Conversion = {
      id: Date.now().toString(),
      url,
      format,
      status: "processing",
      createdAt: new Date().toISOString().split("T")[0],
      appName,
    };

    setHistory((prev) => [newConversion, ...prev]);

    try {
      const { data: generatedKeyData } = await supabase.functions.invoke("generate-signing-key");
      const response = await supabase.functions.invoke("generate-apk", {
        body: {
          url,
          packageName: `app.lovable.${appName.replace(/[^a-z0-9]/gi, "")}`,
          format,
          keyAlias: generatedKeyData?.alias,
          keyPassword: generatedKeyData?.keyPassword,
          storePassword: generatedKeyData?.storePassword,
          fullName: generatedKeyData?.cn,
          organizationalUnit: generatedKeyData?.ou,
          organization: generatedKeyData?.o,
          countryCode: generatedKeyData?.c,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const blob = new Blob([response.data], { type: "application/zip" });
      const downloadUrl = URL.createObjectURL(blob);

      setHistory((prev) =>
        prev.map((c) =>
          c.id === newConversion.id
            ? { ...c, status: "complete" as ConversionStatus, downloadUrl }
            : c
        )
      );
      toast({ title: "Build complete!", description: "Your APK/AAB package is ready to download." });
    } catch (err: any) {
      setHistory((prev) =>
        prev.map((c) =>
          c.id === newConversion.id ? { ...c, status: "failed" as ConversionStatus } : c
        )
      );
      toast({ title: "Build failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setConverting(false);
      setUrl("");
      setKeystoreFile(null);
    }
  };

  const handleDownload = (conv: Conversion) => {
    if (conv.downloadUrl) {
      const link = document.createElement("a");
      link.href = conv.downloadUrl;
      link.download = `${conv.appName}-android-build.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Downloaded!", description: "Your build package contains the generated APK/AAB output from the cloud builder." });
    }
  };

  const handleRetry = (conv: Conversion) => {
    setHistory((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, status: "processing" as ConversionStatus } : c))
    );
    toast({ title: "Retrying conversion", description: `Re-processing ${conv.appName}...` });

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, status: "complete" as ConversionStatus } : c))
      );
      toast({ title: "Conversion complete!", description: `${conv.appName}.${conv.format} is ready.` });
    }, 3000);
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground font-body mt-1">Convert web apps into cloud-built Android packages for APK and AAB delivery.</p>
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
                  className={`pl-10 bg-muted border-border h-12 ${urlError ? "border-destructive" : ""}`}
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  required
                  disabled={converting}
                />
              </div>
              {urlError && (
                <p className="text-sm text-destructive flex items-center gap-1 font-body">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {urlError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-body text-sm">Output Format</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("apk")}
                  disabled={converting}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    format === "apk"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <Smartphone className={`h-5 w-5 ${format === "apk" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${format === "apk" ? "text-foreground" : "text-muted-foreground"}`}>APK</p>
                    <p className="text-xs text-muted-foreground">Direct install</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("aab")}
                  disabled={converting}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    format === "aab"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <Download className={`h-5 w-5 ${format === "aab" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${format === "aab" ? "text-foreground" : "text-muted-foreground"}`}>AAB</p>
                    <p className="text-xs text-muted-foreground">Play Store</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body text-sm">Signing Key (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".keystore,.jks"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setKeystoreFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
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
                    dragOver
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/50 hover:border-primary/30"
                  } ${converting ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-body">
                    Drop your .keystore file here or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Leave empty to use debug signing key
                  </p>
                </div>
              )}
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

        {/* Signing Key Generator */}
        <SigningKeyGenerator />

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
            {history.length > 0 && (
              <span className="text-sm text-muted-foreground font-body ml-auto">{history.length} conversions</span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-body">No conversions yet. Enter a URL above to get started.</p>
            </div>
          ) : (
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
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm font-body">{conv.appName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[350px]">
                            {conv.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="uppercase text-xs font-mono">
                          {conv.format}
                        </Badge>
                        <Badge variant="outline" className={`${statusInfo.className} flex items-center gap-1`}>
                          <StatusIcon className={`h-3 w-3 ${conv.status === "processing" ? "animate-spin" : ""}`} />
                          {statusInfo.label}
                        </Badge>
                        {conv.status === "complete" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(conv)}
                            title={`Download ${conv.appName}.${conv.format}`}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        )}
                        {conv.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleRetry(conv)}
                          >
                            Retry
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
