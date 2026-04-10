import { corsHeaders } from '@supabase/supabase-js/cors'

function generateAndroidProject(url: string, appName: string, packageName: string): Map<string, string> {
  const files = new Map<string, string>();
  const packagePath = packageName.replace(/\./g, '/');

  files.set('settings.gradle', `rootProject.name = '${appName}'\ninclude ':app'\n`);

  files.set('build.gradle', `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
    }
}
allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`);

  files.set('gradle.properties', `org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
`);

  files.set('app/build.gradle', `plugins {
    id 'com.android.application'
}
android {
    namespace '${packageName}'
    compileSdk 34
    defaultConfig {
        applicationId '${packageName}'
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName '1.0'
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.8.0'
}
`);

  files.set(`app/src/main/AndroidManifest.xml`, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${appName}"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

  files.set(`app/src/main/java/${packagePath}/MainActivity.java`, `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("${url}");
        setContentView(webView);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
`);

  files.set('app/src/main/res/values/strings.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>
`);

  files.set('app/src/main/res/values/colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#6200EE</color>
    <color name="colorPrimaryDark">#3700B3</color>
    <color name="colorAccent">#03DAC5</color>
</resources>
`);

  files.set('app/proguard-rules.pro', '# Add project specific ProGuard rules here.\n');

  files.set('README.md', `# ${appName}

Android WebView wrapper for: ${url}

## Build Instructions

### Option 1: Android Studio
1. Open this folder in Android Studio
2. Wait for Gradle sync to complete
3. Click Build → Generate Signed Bundle/APK
4. Choose APK, select your keystore, and build

### Option 2: Command Line
\`\`\`bash
# Make sure ANDROID_HOME is set
chmod +x gradlew
./gradlew assembleRelease
\`\`\`

The APK will be at: \`app/build/outputs/apk/release/app-release.apk\`
`);

  return files;
}

function createZipBuffer(files: Map<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const entries: { name: Uint8Array; data: Uint8Array; offset: number }[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);

    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); // signature
    hv.setUint16(4, 20, true); // version needed
    hv.setUint16(6, 0, true); // flags
    hv.setUint16(8, 0, true); // compression (store)
    hv.setUint16(10, 0, true); // mod time
    hv.setUint16(12, 0, true); // mod date
    hv.setUint32(14, crc, true); // crc32
    hv.setUint32(18, dataBytes.length, true); // compressed size
    hv.setUint32(22, dataBytes.length, true); // uncompressed size
    hv.setUint16(26, nameBytes.length, true); // name length
    hv.setUint16(28, 0, true); // extra length
    header.set(nameBytes, 30);

    entries.push({ name: nameBytes, data: dataBytes, offset });
    parts.push(header, dataBytes);
    offset += header.length + dataBytes.length;
  }

  const centralDirOffset = offset;
  for (const entry of entries) {
    const crc = crc32(entry.data);
    const cdh = new Uint8Array(46 + entry.name.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, entry.name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, entry.offset, true);
    cdh.set(entry.name, 46);
    parts.push(cdh);
    offset += cdh.length;
  }

  const centralDirSize = offset - centralDirOffset;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);
  ev.setUint16(20, 0, true);
  parts.push(eocd);

  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, appName, packageName, format } = await req.json();

    if (!url || !appName) {
      return new Response(
        JSON.stringify({ error: 'url and appName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safePkg = packageName || `com.webapp.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const files = generateAndroidProject(url, appName, safePkg);
    const zipBytes = createZipBuffer(files);

    const filename = `${appName.replace(/[^a-zA-Z0-9]/g, '_')}-android-project.zip`;

    return new Response(zipBytes.buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
