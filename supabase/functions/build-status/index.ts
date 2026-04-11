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

    // Map Codemagic status to our status
    const cmStatus = build.status || 'unknown';
    let status: string;
    let downloadUrl: string | null = null;

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
        // Find the AAB artifact
        if (build.artefacts && Array.isArray(build.artefacts)) {
          const aab = build.artefacts.find((a: any) => 
            a.name?.endsWith('.aab') || a.type === 'aab'
          );
          const apk = build.artefacts.find((a: any) => 
            a.name?.endsWith('.apk') || a.type === 'apk'
          );
          const artifact = aab || apk || build.artefacts[0];
          if (artifact) {
            downloadUrl = artifact.url || artifact.downloadUrl || null;
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
      downloadUrl,
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
