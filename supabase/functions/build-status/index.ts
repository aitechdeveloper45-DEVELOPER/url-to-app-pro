const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CODEMAGIC_API = 'https://api.codemagic.io';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CODEMAGIC_API_TOKEN = Deno.env.get('CODEMAGIC_API_TOKEN');
    if (!CODEMAGIC_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'CODEMAGIC_API_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const buildId = url.searchParams.get('buildId');

    if (!buildId) {
      return new Response(JSON.stringify({ error: 'buildId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${CODEMAGIC_API}/builds/${buildId}`, {
      headers: { 'x-auth-token': CODEMAGIC_API_TOKEN },
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Failed to get build status: ${errText}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const build = data.build || data;

    const cmStatus = build.status || 'unknown';
    let status: string;
    let aabUrl: string | null = null;
    let apkUrl: string | null = null;

    switch (cmStatus) {
      case 'queued':
      case 'preparing':
        status = 'queued';
        break;
      case 'building':
      case 'testing':
      case 'publishing':
        status = 'building';
        break;
      case 'finished':
        status = 'complete';
        // Extract individual artifact download URLs
        if (build.artefacts && Array.isArray(build.artefacts)) {
          for (const a of build.artefacts) {
            const name = (a.name || '').toLowerCase();
            const artifactUrl = a.url || a.downloadUrl || null;
            if (!artifactUrl) continue;

            if (name.endsWith('.aab')) {
              aabUrl = artifactUrl;
            } else if (name.endsWith('.apk')) {
              apkUrl = artifactUrl;
            }
          }
        }
        break;
      case 'failed':
      case 'canceled':
      case 'cancelled':
        status = 'failed';
        break;
      default:
        status = 'unknown';
    }

    return new Response(JSON.stringify({
      buildId,
      status,
      aabUrl,
      apkUrl,
      downloadUrl: aabUrl || apkUrl || null,
      duration: build.duration || null,
      startedAt: build.startedAt || null,
      finishedAt: build.finishedAt || null,
      message: build.message || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Build status error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
