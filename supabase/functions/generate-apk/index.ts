const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PWABUILDER_URL = 'https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage';

type RequestBody = {
  url: string;
  format?: 'apk' | 'aab';
  packageName?: string;
  keyAlias?: string;
  keyPassword?: string;
  storePassword?: string;
  validityYears?: number;
  fullName?: string;
  organizationalUnit?: string;
  organization?: string;
  city?: string;
  state?: string;
  countryCode?: string;
};

function sanitizeAppName(hostname: string) {
  return hostname
    .replace(/^www\./, '')
    .split('.')[0]
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim() || 'My App';
}

function sanitizePackageName(value: string) {
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

async function fetchManifest(url: string) {
  const html = await fetch(url, { redirect: 'follow' }).then((res) => res.text());
  const manifestMatch = html.match(/<link[^>]*rel=["'][^"']*manifest[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*manifest[^"']*["']/i);

  if (!manifestMatch) {
    throw new Error('This website does not expose a web manifest, which is required for Play Store builds.');
  }

  const manifestUrl = new URL(manifestMatch[1], url).toString();
  const manifest = await fetch(manifestUrl, { redirect: 'follow' }).then((res) => res.json());
  return { manifest, manifestUrl };
}

function pickBestIcon(manifest: any, baseUrl: string, purpose?: 'maskable' | 'monochrome') {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const filtered = purpose
    ? icons.filter((icon: any) => typeof icon.purpose === 'string' && icon.purpose.includes(purpose))
    : icons;
  const candidates = filtered.length > 0 ? filtered : icons;

  const ranked = candidates
    .map((icon: any) => {
      const sizeText = typeof icon.sizes === 'string' ? icon.sizes.split(' ')[0] : '0x0';
      const [w] = sizeText.split('x').map((n) => parseInt(n, 10) || 0);
      return { icon, size: w };
    })
    .sort((a: any, b: any) => b.size - a.size);

  if (!ranked[0]?.icon?.src) return null;
  return new URL(ranked[0].icon.src, baseUrl).toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body.url) {
      return new Response(JSON.stringify({ error: 'URL is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedUrl = new URL(body.url);
    const host = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const { manifest, manifestUrl } = await fetchManifest(body.url);

    const appName = manifest.name || manifest.short_name || sanitizeAppName(parsedUrl.hostname);
    const launcherName = manifest.short_name || manifest.name || appName;
    const packageId = sanitizePackageName(body.packageName || `app.lovable.${parsedUrl.hostname.replace(/[^a-z0-9]/gi, '')}`);
    const iconUrl = pickBestIcon(manifest, manifestUrl) || `${host}/favicon.ico`;
    const maskableIconUrl = pickBestIcon(manifest, manifestUrl, 'maskable');
    const startUrl = typeof manifest.start_url === 'string' ? manifest.start_url : '/';
    const themeColor = manifest.theme_color || '#ffffff';
    const backgroundColor = manifest.background_color || '#ffffff';
    const display = ['fullscreen', 'standalone'].includes(manifest.display) ? manifest.display : 'standalone';
    const orientation = typeof manifest.orientation === 'string' ? manifest.orientation : 'default';

    const payload = {
      additionalTrustedOrigins: [],
      appVersion: '1.0.0',
      appVersionCode: 1,
      backgroundColor,
      display,
      enableNotifications: false,
      enableSiteSettingsShortcut: true,
      fallbackType: 'customtabs',
      features: {
        locationDelegation: { enabled: true },
        playBilling: { enabled: false },
      },
      host,
      iconUrl,
      includeSourceCode: false,
      isChromeOSOnly: false,
      launcherName,
      maskableIconUrl,
      monochromeIconUrl: pickBestIcon(manifest, manifestUrl, 'monochrome'),
      name: appName,
      navigationColor: themeColor,
      navigationColorDark: themeColor,
      navigationDividerColor: themeColor,
      navigationDividerColorDark: themeColor,
      orientation,
      packageId,
      serviceAccountJsonFile: null,
      shortcuts: Array.isArray(manifest.shortcuts) ? manifest.shortcuts : [],
      signingMode: 'new',
      signing: {
        file: null,
        alias: body.keyAlias || 'app-key',
        fullName: body.fullName || 'Developer',
        organization: body.organization || 'My Company',
        organizationalUnit: body.organizationalUnit || 'Development',
        countryCode: (body.countryCode || 'US').toUpperCase(),
        keyPassword: body.keyPassword || 'TempPass123!',
        storePassword: body.storePassword || 'TempPass123!',
      },
      splashScreenFadeOutDuration: 300,
      startUrl,
      themeColor,
      webManifestUrl: manifestUrl,
    };

    const response = await fetch(PWABUILDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'platform-identifier': 'lovable',
        'platform-identifier-version': '1',
      },
      body: JSON.stringify(payload),
    });

    const buffer = await response.arrayBuffer();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: new TextDecoder().decode(buffer) }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filename = `${appName.replace(/[^a-zA-Z0-9]/g, '_')}-android-build.zip`;
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});