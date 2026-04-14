import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BuildPhase = "idle" | "queued" | "building" | "complete" | "failed";

interface BuildLog {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface BuildState {
  buildId: string | null;
  phase: BuildPhase;
  logs: BuildLog[];
  downloadUrl: string | null;
  aabUrl: string | null;
  apkUrl: string | null;
  duration: number | null;
  error: string | null;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatBuildFailureMessage = (message?: string | null) => {
  if (!message) return "Build failed";

  if (message.includes("Step 3 script `Configure app`")) {
    return "Codemagic could not run Configure app because the build repo structure is wrong. Add scripts/configure.js, scripts/enhance-native.js, and scripts/set-permissions.js inside a root-level scripts folder.";
  }

  return message;
};

const formatRequestErrorMessage = (error: unknown) => {
  const message = getErrorMessage(error, "Build trigger failed");

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach the build service. Retry once; if it still fails, stay signed in and check your network connection.";
  }

  return message;
};

export function useBuildPolling() {
  const [state, setState] = useState<BuildState>({
    buildId: null,
    phase: "idle",
    logs: [],
    downloadUrl: null,
    aabUrl: null,
    apkUrl: null,
    duration: null,
    error: null,
  });
  const intervalRef = useRef<number | null>(null);

  const addLog = useCallback((message: string, type: BuildLog["type"] = "info") => {
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message, type }],
    }));
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (buildId: string) => {
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/build-status?buildId=${buildId}`;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(functionUrl, {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Status check failed" }));
        throw new Error(err.error || "Status check failed");
      }

      const data = await res.json();

      if (data.status === "queued") {
        setState((prev) => ({ ...prev, phase: "queued" }));
      } else if (data.status === "building") {
        setState((prev) => {
          if (prev.phase !== "building") {
            return {
              ...prev,
              phase: "building",
              logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: "Build started — compiling native Android project...", type: "info" }],
            };
          }
          return prev;
        });
      } else if (data.status === "complete") {
        stopPolling();
        const hasAab = !!data.aabUrl;
        const hasApk = !!data.apkUrl;
        const msg = hasAab && hasApk
          ? "Build complete! Your AAB and APK are ready to download."
          : hasAab
          ? "Build complete! Your AAB is ready to download."
          : hasApk
          ? "Build complete! Your APK is ready to download."
          : "Build complete!";
        setState((prev) => ({
          ...prev,
          phase: "complete",
          downloadUrl: data.aabUrl || data.apkUrl || data.downloadUrl,
          aabUrl: data.aabUrl || null,
          apkUrl: data.apkUrl || null,
          duration: data.duration,
          logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: msg, type: "success" }],
        }));
      } else if (data.status === "failed") {
        stopPolling();
        const failureMessage = formatBuildFailureMessage(data.message);
        setState((prev) => ({
          ...prev,
          phase: "failed",
          error: failureMessage,
          logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: `Build failed: ${failureMessage}`, type: "error" }],
        }));
      }
    } catch (err: any) {
      console.error("Poll error:", err);
    }
  }, [stopPolling]);

  const startBuild = useCallback(async (params: {
    url: string;
    appName: string;
    packageName: string;
    iconUrl?: string;
    settings: Record<string, any>;
  }) => {
    setState({
      buildId: null,
      phase: "queued",
      logs: [{ time: new Date().toLocaleTimeString(), message: `Starting build for ${params.appName}...`, type: "info" }],
      downloadUrl: null,
      aabUrl: null,
      apkUrl: null,
      duration: null,
      error: null,
    });

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-apk`;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Build trigger failed" }));
        throw new Error(err.error || "Build trigger failed");
      }

      const data = await res.json();
      const buildId = data.buildId;

      setState((prev) => ({
        ...prev,
        buildId,
        logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: `Build queued (ID: ${buildId}). Waiting for Codemagic...`, type: "info" }],
      }));

      // Start polling every 10 seconds
      intervalRef.current = window.setInterval(() => pollStatus(buildId), 10000);
      // Also poll immediately after a short delay
      setTimeout(() => pollStatus(buildId), 3000);

      return buildId;
    } catch (err: any) {
      const errorMessage = formatRequestErrorMessage(err);
      setState((prev) => ({
        ...prev,
        phase: "failed",
        error: errorMessage,
        logs: [...prev.logs, { time: new Date().toLocaleTimeString(), message: `Error: ${errorMessage}`, type: "error" }],
      }));
      return null;
    }
  }, [pollStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      buildId: null,
      phase: "idle",
      logs: [],
      downloadUrl: null,
      aabUrl: null,
      apkUrl: null,
      duration: null,
      error: null,
    });
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { ...state, startBuild, reset, addLog };
}
