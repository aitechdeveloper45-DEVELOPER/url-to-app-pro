import { corsHeaders } from '@supabase/supabase-js/cors';

const CODEMAGIC_API = 'https://api.codemagic.io';

interface BuildRequest {
  url: string;
  appName: string;
  packageName: string;
  iconUrl?: string;
  settings: {
    statusBarColor?: string;
    navigationBarColor?: string;
    loadingScreenEnabled?: boolean;
    loadingScreenColor?: string;
    fullscreenMode?: boolean;
    orientationLock?: string;
    screenshotDisable?: boolean;
    pullToRefresh?: boolean;
    keepScreenOn?: boolean;
    secureMode?: boolean;
    clipboardAccess?: boolean;
    customJsHead?: string;
    customJsBody?: string;
    customCss?: string;
    // Permissions
    permCamera?: boolean;
    permMicrophone?: boolean;
    permVibration?: boolean;
    permSms?: boolean;
    permFileAccess?: boolean;
    permLocation?: boolean;
    permContacts?: boolean;
    permPhone?: boolean;
    permBluetooth?: boolean;
    permNfc?: boolean;
    permNotifications?: boolean;
    permBiometric?: boolean;
    permWifi?: boolean;
    permAudio?: boolean;
  };
}

function sanitizePackageName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  const parts = cleaned.split('.').filter(Boolean).map((part) => {
    const normalized = part.replace(/[^a-z0-9]/g, '');
    return /^[a-z]/.test(normalized) ? normalized : `app${normalized || 'part'}`;
  });
  if (parts.length >= 2) return parts.join('.');
  return `app.lovable.${parts[0] || 'webapp'}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CODEMAGIC_API_TOKEN = Deno.env.get('CODEMAGIC_API_TOKEN');
    const CODEMAGIC_APP_ID = Deno.env.get('CODEMAGIC_APP_ID');

    if (!CODEMAGIC_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'CODEMAGIC_API_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!CODEMAGIC_APP_ID) {
      return new Response(JSON.stringify({ error: 'CODEMAGIC_APP_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: BuildRequest = await req.json();

    if (!body.url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedUrl = new URL(body.url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    const appName = body.appName || hostname.split('.')[0] || 'MyApp';
    const packageName = sanitizePackageName(body.packageName || `com.droidify.${hostname.replace(/[^a-z0-9]/gi, '')}`);

    // Build environment variables that the Codemagic template project will use
    const envVars: Record<string, string> = {
      APP_URL: body.url,
      APP_NAME: appName,
      APP_PACKAGE_NAME: packageName,
      APP_ICON_URL: body.iconUrl || '',
      STATUS_BAR_COLOR: body.settings?.statusBarColor || '#000000',
      NAVIGATION_BAR_COLOR: body.settings?.navigationBarColor || '#000000',
      LOADING_SCREEN_ENABLED: String(body.settings?.loadingScreenEnabled ?? true),
      LOADING_SCREEN_COLOR: body.settings?.loadingScreenColor || '#ffffff',
      FULLSCREEN_MODE: String(body.settings?.fullscreenMode ?? false),
      ORIENTATION_LOCK: body.settings?.orientationLock || 'default',
      SCREENSHOT_DISABLE: String(body.settings?.screenshotDisable ?? false),
      PULL_TO_REFRESH: String(body.settings?.pullToRefresh ?? true),
      KEEP_SCREEN_ON: String(body.settings?.keepScreenOn ?? false),
      SECURE_MODE: String(body.settings?.secureMode ?? false),
      CLIPBOARD_ACCESS: String(body.settings?.clipboardAccess ?? true),
      CUSTOM_JS_HEAD: body.settings?.customJsHead || '',
      CUSTOM_JS_BODY: body.settings?.customJsBody || '',
      CUSTOM_CSS: body.settings?.customCss || '',
      // Permissions
      PERM_CAMERA: String(body.settings?.permCamera ?? false),
      PERM_MICROPHONE: String(body.settings?.permMicrophone ?? false),
      PERM_VIBRATION: String(body.settings?.permVibration ?? true),
      PERM_SMS: String(body.settings?.permSms ?? false),
      PERM_FILE_ACCESS: String(body.settings?.permFileAccess ?? true),
      PERM_LOCATION: String(body.settings?.permLocation ?? false),
      PERM_CONTACTS: String(body.settings?.permContacts ?? false),
      PERM_PHONE: String(body.settings?.permPhone ?? false),
      PERM_BLUETOOTH: String(body.settings?.permBluetooth ?? false),
      PERM_NFC: String(body.settings?.permNfc ?? false),
      PERM_NOTIFICATIONS: String(body.settings?.permNotifications ?? true),
      PERM_BIOMETRIC: String(body.settings?.permBiometric ?? false),
      PERM_WIFI: String(body.settings?.permWifi ?? false),
      PERM_AUDIO: String(body.settings?.permAudio ?? true),
    };

    console.log(`Starting Codemagic build: ${appName} (${packageName}) for ${body.url}`);

    // Trigger Codemagic build via API
    const buildResponse = await fetch(`${CODEMAGIC_API}/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': CODEMAGIC_API_TOKEN,
      },
      body: JSON.stringify({
        appId: CODEMAGIC_APP_ID,
        workflowId: 'android-build',
        branch: 'main',
        environment: {
          variables: envVars,
        },
      }),
    });

    if (!buildResponse.ok) {
      const errText = await buildResponse.text();
      console.error(`Codemagic API error: ${buildResponse.status} - ${errText}`);
      return new Response(JSON.stringify({ 
        error: `Build trigger failed (${buildResponse.status}): ${errText}` 
      }), {
        status: buildResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buildData = await buildResponse.json();
    const buildId = buildData.buildId;

    console.log(`Codemagic build started: ${buildId}`);

    return new Response(JSON.stringify({
      buildId,
      status: 'queued',
      appName,
      packageName,
      message: 'Build started on Codemagic. Use /build-status to poll for completion.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Build error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
