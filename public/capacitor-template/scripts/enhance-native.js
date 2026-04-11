const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCREENSHOT_DISABLE = process.env.SCREENSHOT_DISABLE === 'true';
const SECURE_MODE = process.env.SECURE_MODE === 'true';
const KEEP_SCREEN_ON = process.env.KEEP_SCREEN_ON === 'true';
const PULL_TO_REFRESH = process.env.PULL_TO_REFRESH === 'true';
const FULLSCREEN_MODE = process.env.FULLSCREEN_MODE === 'true';
const ORIENTATION_LOCK = process.env.ORIENTATION_LOCK || 'default';
const STATUS_BAR_COLOR = process.env.STATUS_BAR_COLOR || '#000000';
const NAVIGATION_BAR_COLOR = process.env.NAVIGATION_BAR_COLOR || '#000000';
const APP_NAME = process.env.APP_NAME || 'MyApp';
const APP_ICON_URL = process.env.APP_ICON_URL || '';

const MAIN_ACTIVITY_PATH = 'android/app/src/main/java';
const RES_PATH = 'android/app/src/main/res';

// Find MainActivity
function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = findMainActivity(fullPath);
      if (result) return result;
    } else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') {
      return fullPath;
    }
  }
  return null;
}

// 1. Enhance MainActivity with native features
const mainActivityPath = findMainActivity(MAIN_ACTIVITY_PATH);
if (mainActivityPath) {
  console.log(`Found MainActivity at: ${mainActivityPath}`);
  let content = fs.readFileSync(mainActivityPath, 'utf8');
  const isKotlin = mainActivityPath.endsWith('.kt');

  // Add imports
  const imports = [
    'import android.os.Bundle;',
    'import android.view.WindowManager;',
    'import android.webkit.WebView;',
    'import android.net.ConnectivityManager;',
    'import android.net.NetworkCapabilities;',
    'import android.content.Context;',
  ];

  if (isKotlin) {
    // Kotlin version
    const kotlinImports = imports.map(i => i.replace(';', ''));
    const importBlock = kotlinImports.join('\n');
    content = content.replace('import', `${importBlock}\nimport`);
  } else {
    const importBlock = imports.join('\n');
    content = content.replace('import', `${importBlock}\nimport`);
  }

  // Add onCreate enhancements
  const enhancements = [];

  if (SCREENSHOT_DISABLE || SECURE_MODE) {
    enhancements.push(
      '        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);'
    );
    console.log('✓ Screenshot protection enabled');
  }

  if (KEEP_SCREEN_ON) {
    enhancements.push(
      '        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);'
    );
    console.log('✓ Keep screen on enabled');
  }

  if (FULLSCREEN_MODE) {
    enhancements.push(
      '        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);'
    );
    console.log('✓ Fullscreen mode enabled');
  }

  if (enhancements.length > 0) {
    const onCreateCode = `
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
${enhancements.join('\n')}
    }`;
    
    // Insert before the closing brace of the class
    content = content.replace(/}\s*$/, `${onCreateCode}\n}`);
    fs.writeFileSync(mainActivityPath, content);
    console.log('✓ MainActivity enhanced');
  }
}

// 2. Set orientation in AndroidManifest
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  if (ORIENTATION_LOCK !== 'default') {
    manifest = manifest.replace(
      'android:screenOrientation="unspecified"',
      `android:screenOrientation="${ORIENTATION_LOCK}"`
    );
    // Also try if no orientation is set
    manifest = manifest.replace(
      '<activity',
      `<activity android:screenOrientation="${ORIENTATION_LOCK}"`
    );
    console.log(`✓ Orientation locked: ${ORIENTATION_LOCK}`);
  }

  // Set theme colors in styles
  fs.writeFileSync(manifestPath, manifest);
}

// 3. Create/update styles.xml with theme colors
const stylesPath = path.join(RES_PATH, 'values/styles.xml');
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  styles = styles.replace(
    /<item name="android:statusBarColor">.*?<\/item>/,
    `<item name="android:statusBarColor">${STATUS_BAR_COLOR}</item>`
  );
  styles = styles.replace(
    /<item name="android:navigationBarColor">.*?<\/item>/,
    `<item name="android:navigationBarColor">${NAVIGATION_BAR_COLOR}</item>`
  );
  fs.writeFileSync(stylesPath, styles);
  console.log('✓ Theme colors applied');
}

// 4. Download and set app icon
if (APP_ICON_URL) {
  try {
    const iconSizes = {
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192,
    };

    console.log('Downloading app icon...');
    execSync(`curl -sL "${APP_ICON_URL}" -o /tmp/app_icon.png`);

    for (const [folder, size] of Object.entries(iconSizes)) {
      const targetDir = path.join(RES_PATH, folder);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // Use ImageMagick if available, otherwise copy as-is
      try {
        execSync(`convert /tmp/app_icon.png -resize ${size}x${size} ${path.join(targetDir, 'ic_launcher.png')}`);
        execSync(`convert /tmp/app_icon.png -resize ${size}x${size} ${path.join(targetDir, 'ic_launcher_round.png')}`);
      } catch {
        fs.copyFileSync('/tmp/app_icon.png', path.join(targetDir, 'ic_launcher.png'));
        fs.copyFileSync('/tmp/app_icon.png', path.join(targetDir, 'ic_launcher_round.png'));
      }
    }
    console.log('✓ App icons set');
  } catch (err) {
    console.warn('⚠ Could not download/process icon:', err.message);
  }
}

// 5. Create network security config for cleartext traffic
const networkSecurityDir = path.join(RES_PATH, 'xml');
if (!fs.existsSync(networkSecurityDir)) fs.mkdirSync(networkSecurityDir, { recursive: true });

fs.writeFileSync(path.join(networkSecurityDir, 'network_security_config.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`);
console.log('✓ Network security config created');

// 6. Configure ProGuard for smaller APK
const proguardPath = 'android/app/proguard-rules.pro';
if (fs.existsSync(proguardPath)) {
  const proguardRules = `
# Keep Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Keep WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Optimize
-optimizationpasses 5
-allowaccessmodification
`;
  fs.appendFileSync(proguardPath, proguardRules);
  console.log('✓ ProGuard rules configured');
}

console.log('\n✅ All native enhancements applied successfully');
