import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Code, Shield, Smartphone, Camera, Mic, Vibrate,
  MessageSquare, FileText, MapPin, Users, Phone, Bluetooth, Bell,
  Clipboard, ScreenShare, RefreshCw, Maximize, RotateCcw, Palette,
  Navigation, Loader2, Lock, Wifi, MonitorSpeaker,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export interface AppSettings {
  // Permissions
  permCamera: boolean;
  permMicrophone: boolean;
  permVibration: boolean;
  permSms: boolean;
  permFileAccess: boolean;
  permLocation: boolean;
  permContacts: boolean;
  permPhone: boolean;
  permBluetooth: boolean;
  permNfc: boolean;
  permNotifications: boolean;
  permBiometric: boolean;
  permWifi: boolean;
  permAudio: boolean;

  // App Behavior
  clipboardAccess: boolean;
  screenshotDisable: boolean;
  pullToRefresh: boolean;
  fullscreenMode: boolean;
  orientationLock: "default" | "portrait" | "landscape";
  keepScreenOn: boolean;
  secureMode: boolean;

  // Appearance
  statusBarColor: string;
  navigationBarColor: string;
  loadingScreenEnabled: boolean;
  loadingScreenColor: string;

  // Custom Code
  customJsHead: string;
  customJsBody: string;
  customCss: string;
}

export const defaultSettings: AppSettings = {
  permCamera: false,
  permMicrophone: false,
  permVibration: true,
  permSms: false,
  permFileAccess: true,
  permLocation: false,
  permContacts: false,
  permPhone: false,
  permBluetooth: false,
  permNfc: false,
  permNotifications: true,
  permBiometric: false,
  permWifi: false,
  permAudio: true,

  clipboardAccess: true,
  screenshotDisable: false,
  pullToRefresh: true,
  fullscreenMode: false,
  orientationLock: "default",
  keepScreenOn: false,
  secureMode: false,

  statusBarColor: "#000000",
  navigationBarColor: "#000000",
  loadingScreenEnabled: true,
  loadingScreenColor: "#ffffff",

  customJsHead: "",
  customJsBody: "",
  customCss: "",
};

interface AdvancedSettingsProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  disabled?: boolean;
}

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  open,
  onClick,
}: {
  icon: any;
  title: string;
  subtitle: string;
  open: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold font-body">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <ChevronDown
      className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
    />
  </button>
);

const PermToggle = ({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-body">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const AdvancedSettings = ({ settings, onChange, disabled }: AdvancedSettingsProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (section: string) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-3">
      {/* Permissions */}
      <SectionHeader
        icon={Shield}
        title="Android Permissions"
        subtitle="Camera, mic, location, files & more"
        open={!!openSections.perms}
        onClick={() => toggle("perms")}
      />
      <AnimatePresence>
        {openSections.perms && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-xl p-4 space-y-1">
              <PermToggle icon={Camera} label="Camera" description="Access device camera" checked={settings.permCamera} onChange={(v) => update("permCamera", v)} disabled={disabled} />
              <PermToggle icon={Mic} label="Microphone" description="Record audio" checked={settings.permMicrophone} onChange={(v) => update("permMicrophone", v)} disabled={disabled} />
              <PermToggle icon={Vibrate} label="Vibration" description="Haptic feedback" checked={settings.permVibration} onChange={(v) => update("permVibration", v)} disabled={disabled} />
              <PermToggle icon={MessageSquare} label="SMS" description="Send & read SMS" checked={settings.permSms} onChange={(v) => update("permSms", v)} disabled={disabled} />
              <PermToggle icon={FileText} label="File Access" description="Read/write storage" checked={settings.permFileAccess} onChange={(v) => update("permFileAccess", v)} disabled={disabled} />
              <PermToggle icon={MapPin} label="Location" description="GPS & network location" checked={settings.permLocation} onChange={(v) => update("permLocation", v)} disabled={disabled} />
              <PermToggle icon={Users} label="Contacts" description="Read contacts list" checked={settings.permContacts} onChange={(v) => update("permContacts", v)} disabled={disabled} />
              <PermToggle icon={Phone} label="Phone" description="Make & manage calls" checked={settings.permPhone} onChange={(v) => update("permPhone", v)} disabled={disabled} />
              <PermToggle icon={Bluetooth} label="Bluetooth" description="Connect to BLE devices" checked={settings.permBluetooth} onChange={(v) => update("permBluetooth", v)} disabled={disabled} />
              <PermToggle icon={Smartphone} label="NFC" description="Near-field communication" checked={settings.permNfc} onChange={(v) => update("permNfc", v)} disabled={disabled} />
              <PermToggle icon={Bell} label="Notifications" description="Push notifications" checked={settings.permNotifications} onChange={(v) => update("permNotifications", v)} disabled={disabled} />
              <PermToggle icon={Lock} label="Biometric" description="Fingerprint / face auth" checked={settings.permBiometric} onChange={(v) => update("permBiometric", v)} disabled={disabled} />
              <PermToggle icon={Wifi} label="Wi-Fi State" description="Check network status" checked={settings.permWifi} onChange={(v) => update("permWifi", v)} disabled={disabled} />
              <PermToggle icon={MonitorSpeaker} label="Audio" description="Audio focus & playback" checked={settings.permAudio} onChange={(v) => update("permAudio", v)} disabled={disabled} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Behavior */}
      <SectionHeader
        icon={Smartphone}
        title="App Behavior"
        subtitle="Clipboard, screenshots, pull-to-refresh & more"
        open={!!openSections.behavior}
        onClick={() => toggle("behavior")}
      />
      <AnimatePresence>
        {openSections.behavior && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-xl p-4 space-y-1">
              <PermToggle icon={Clipboard} label="Clipboard Access" description="Allow copy & paste" checked={settings.clipboardAccess} onChange={(v) => update("clipboardAccess", v)} disabled={disabled} />
              <PermToggle icon={ScreenShare} label="Disable Screenshots" description="Block screen capture" checked={settings.screenshotDisable} onChange={(v) => update("screenshotDisable", v)} disabled={disabled} />
              <PermToggle icon={RefreshCw} label="Pull to Refresh" description="Swipe down to reload" checked={settings.pullToRefresh} onChange={(v) => update("pullToRefresh", v)} disabled={disabled} />
              <PermToggle icon={Maximize} label="Fullscreen Mode" description="Hide status & nav bars" checked={settings.fullscreenMode} onChange={(v) => update("fullscreenMode", v)} disabled={disabled} />
              <PermToggle icon={Loader2} label="Keep Screen On" description="Prevent screen sleep" checked={settings.keepScreenOn} onChange={(v) => update("keepScreenOn", v)} disabled={disabled} />
              <PermToggle icon={Lock} label="Secure Mode" description="Block recent apps preview" checked={settings.secureMode} onChange={(v) => update("secureMode", v)} disabled={disabled} />

              <div className="pt-2">
                <Label className="text-sm font-body">Orientation Lock</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(["default", "portrait", "landscape"] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={disabled}
                      onClick={() => update("orientationLock", o)}
                      className={`p-2 rounded-lg border text-xs font-body capitalize transition-all ${
                        settings.orientationLock === o
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <RotateCcw className="h-3 w-3 mx-auto mb-1" />
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appearance */}
      <SectionHeader
        icon={Palette}
        title="Appearance"
        subtitle="Status bar, nav bar & loading screen"
        open={!!openSections.appearance}
        onClick={() => toggle("appearance")}
      />
      <AnimatePresence>
        {openSections.appearance && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-body">Status Bar Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.statusBarColor}
                      onChange={(e) => update("statusBarColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                      disabled={disabled}
                    />
                    <Input
                      value={settings.statusBarColor}
                      onChange={(e) => update("statusBarColor", e.target.value)}
                      className="bg-muted border-border font-mono text-xs"
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-body">Navigation Bar Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.navigationBarColor}
                      onChange={(e) => update("navigationBarColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                      disabled={disabled}
                    />
                    <Input
                      value={settings.navigationBarColor}
                      onChange={(e) => update("navigationBarColor", e.target.value)}
                      className="bg-muted border-border font-mono text-xs"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
              <PermToggle
                icon={Loader2}
                label="Loading Screen"
                description="Show splash screen while loading"
                checked={settings.loadingScreenEnabled}
                onChange={(v) => update("loadingScreenEnabled", v)}
                disabled={disabled}
              />
              {settings.loadingScreenEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-body">Loading Screen Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.loadingScreenColor}
                      onChange={(e) => update("loadingScreenColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                      disabled={disabled}
                    />
                    <Input
                      value={settings.loadingScreenColor}
                      onChange={(e) => update("loadingScreenColor", e.target.value)}
                      className="bg-muted border-border font-mono text-xs"
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Code Injection */}
      <SectionHeader
        icon={Code}
        title="Custom Code Injection"
        subtitle="JavaScript & CSS injected into the app"
        open={!!openSections.code}
        onClick={() => toggle("code")}
      />
      <AnimatePresence>
        {openSections.code && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-body">JavaScript — Injected in &lt;head&gt;</Label>
                <Textarea
                  placeholder={`// Runs before page loads\nconsole.log("App initialized");`}
                  value={settings.customJsHead}
                  onChange={(e) => update("customJsHead", e.target.value)}
                  className="bg-muted border-border font-mono text-xs min-h-[100px]"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-body">JavaScript — Injected in &lt;body&gt;</Label>
                <Textarea
                  placeholder={`// Runs after page loads\ndocument.addEventListener('DOMContentLoaded', () => {\n  // your code here\n});`}
                  value={settings.customJsBody}
                  onChange={(e) => update("customJsBody", e.target.value)}
                  className="bg-muted border-border font-mono text-xs min-h-[100px]"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-body">Custom CSS</Label>
                <Textarea
                  placeholder={`/* Custom styles */\nbody { -webkit-tap-highlight-color: transparent; }`}
                  value={settings.customCss}
                  onChange={(e) => update("customCss", e.target.value)}
                  className="bg-muted border-border font-mono text-xs min-h-[100px]"
                  disabled={disabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Custom code is injected into the WebView at runtime. Ensure your code is safe and tested.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSettings;
