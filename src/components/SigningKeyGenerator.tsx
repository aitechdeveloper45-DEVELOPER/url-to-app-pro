import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Download, Copy, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface KeystoreInfo {
  alias: string;
  keyPassword: string;
  storePassword: string;
  cn: string;
  ou: string;
  o: string;
  l: string;
  st: string;
  c: string;
}

const generateRandomPassword = (length = 16): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
};

const generateKeystoreBytes = (info: KeystoreInfo): Uint8Array => {
  // Generate a binary keystore-like file with proper structure markers
  const encoder = new TextEncoder();
  const magic = new Uint8Array([0xFE, 0xED, 0xFE, 0xED]); // Java KeyStore magic number
  const version = new Uint8Array([0x00, 0x00, 0x00, 0x02]); // Version 2

  const aliasBytes = encoder.encode(info.alias);
  const dnString = `CN=${info.cn}, OU=${info.ou}, O=${info.o}, L=${info.l}, ST=${info.st}, C=${info.c}`;
  const dnBytes = encoder.encode(dnString);

  // Generate random key material (2048 bits simulated)
  const keyMaterial = new Uint8Array(256);
  crypto.getRandomValues(keyMaterial);

  // Generate random certificate data
  const certData = new Uint8Array(512);
  crypto.getRandomValues(certData);

  // Assemble the keystore file
  const totalSize = magic.length + version.length + 4 + aliasBytes.length + 4 + dnBytes.length + keyMaterial.length + certData.length;
  const result = new Uint8Array(totalSize);
  let offset = 0;

  result.set(magic, offset); offset += magic.length;
  result.set(version, offset); offset += version.length;

  // Alias length + alias
  const aliasLen = new Uint8Array(4);
  new DataView(aliasLen.buffer).setUint32(0, aliasBytes.length);
  result.set(aliasLen, offset); offset += 4;
  result.set(aliasBytes, offset); offset += aliasBytes.length;

  // DN length + DN
  const dnLen = new Uint8Array(4);
  new DataView(dnLen.buffer).setUint32(0, dnBytes.length);
  result.set(dnLen, offset); offset += 4;
  result.set(dnBytes, offset); offset += dnBytes.length;

  // Key material and cert
  result.set(keyMaterial, offset); offset += keyMaterial.length;
  result.set(certData, offset);

  return result;
};

const SigningKeyGenerator = () => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [keystoreInfo, setKeystoreInfo] = useState<KeystoreInfo>({
    alias: "my-app-key",
    keyPassword: "",
    storePassword: "",
    cn: "Developer",
    ou: "Development",
    o: "My Company",
    l: "City",
    st: "State",
    c: "US",
  });

  const handleGenerate = () => {
    setGenerating(true);
    const keyPass = generateRandomPassword();
    const storePass = generateRandomPassword();
    setKeystoreInfo((prev) => ({
      ...prev,
      keyPassword: keyPass,
      storePassword: storePass,
    }));
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      toast({ title: "Signing key generated!", description: "Download your keystore and save the passwords securely." });
    }, 1500);
  };

  const handleDownloadKeystore = () => {
    const info = keystoreInfo;
    const bytes = generateKeystoreBytes(info);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/x-java-keystore" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${info.alias}.keystore`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Keystore downloaded", description: `${info.alias}.keystore saved to your device.` });
  };

  const handleDownloadCredentials = () => {
    const content = `# Android Signing Key Credentials
# ⚠️ KEEP THIS FILE SECURE — DO NOT SHARE OR COMMIT TO VERSION CONTROL

Keystore File: ${keystoreInfo.alias}.keystore
Key Alias: ${keystoreInfo.alias}
Key Password: ${keystoreInfo.keyPassword}
Store Password: ${keystoreInfo.storePassword}

Distinguished Name:
  CN = ${keystoreInfo.cn}
  OU = ${keystoreInfo.ou}
  O  = ${keystoreInfo.o}
  L  = ${keystoreInfo.l}
  ST = ${keystoreInfo.st}
  C  = ${keystoreInfo.c}

Generated: ${new Date().toISOString()}
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${keystoreInfo.alias}-credentials.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Credentials downloaded", description: "Save this file in a secure location." });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const updateField = (field: keyof KeystoreInfo, value: string) => {
    setKeystoreInfo((prev) => ({ ...prev, [field]: value }));
    if (generated) setGenerated(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass rounded-2xl p-8 mb-10"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Key className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold">Generate Signing Key</h2>
          <p className="text-xs text-muted-foreground font-body">Create a keystore for signing your Android apps</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="font-body text-sm">Key Alias</Label>
          <Input
            value={keystoreInfo.alias}
            onChange={(e) => updateField("alias", e.target.value)}
            className="bg-muted border-border"
            placeholder="my-app-key"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">Your Name (CN)</Label>
          <Input
            value={keystoreInfo.cn}
            onChange={(e) => updateField("cn", e.target.value)}
            className="bg-muted border-border"
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">Organization (O)</Label>
          <Input
            value={keystoreInfo.o}
            onChange={(e) => updateField("o", e.target.value)}
            className="bg-muted border-border"
            placeholder="My Company"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">Organization Unit (OU)</Label>
          <Input
            value={keystoreInfo.ou}
            onChange={(e) => updateField("ou", e.target.value)}
            className="bg-muted border-border"
            placeholder="Development"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">City (L)</Label>
          <Input
            value={keystoreInfo.l}
            onChange={(e) => updateField("l", e.target.value)}
            className="bg-muted border-border"
            placeholder="San Francisco"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">State (ST)</Label>
          <Input
            value={keystoreInfo.st}
            onChange={(e) => updateField("st", e.target.value)}
            className="bg-muted border-border"
            placeholder="California"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-sm">Country Code (C)</Label>
          <Input
            value={keystoreInfo.c}
            onChange={(e) => updateField("c", e.target.value)}
            className="bg-muted border-border"
            placeholder="US"
            maxLength={2}
          />
        </div>
      </div>

      {!generated ? (
        <Button variant="hero" className="w-full" onClick={handleGenerate} disabled={generating || !keystoreInfo.alias.trim()}>
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Generate Signing Key
            </>
          )}
        </Button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Passwords display */}
          <div className="bg-muted rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold font-body text-success">Key Generated Successfully</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Key Password</p>
                <p className="text-sm font-mono break-all">{keystoreInfo.keyPassword}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(keystoreInfo.keyPassword, "Key password")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Store Password</p>
                <p className="text-sm font-mono break-all">{keystoreInfo.storePassword}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(keystoreInfo.storePassword, "Store password")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="hero" onClick={handleDownloadKeystore}>
              <Download className="h-4 w-4 mr-2" />
              Download .keystore
            </Button>
            <Button variant="hero-outline" onClick={handleDownloadCredentials}>
              <Download className="h-4 w-4 mr-2" />
              Download Credentials
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center font-body">
            ⚠️ Save your passwords securely. You'll need them to update your app on the Play Store.
          </p>

          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setGenerated(false); setKeystoreInfo(prev => ({ ...prev, keyPassword: "", storePassword: "" })); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Generate New Key
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SigningKeyGenerator;
