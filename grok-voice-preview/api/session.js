// Mints a short-lived xAI realtime client secret for the browser.
// Never sends XAI_API_KEY to the client.

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.end('Method not allowed');
    return;
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'XAI_API_KEY is not configured on this preview' }));
    return;
  }

  const model = process.env.GROK_VOICE_MODEL || 'grok-voice-latest';
  const voice = process.env.GROK_VOICE || 'eve';
  const agentId = process.env.GROK_AGENT_ID || '';

  try {
    const upstream = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
      }),
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'xAI client_secrets failed', detail: payload }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        value: payload.value,
        expires_at: payload.expires_at,
        model,
        voice,
        agentId: agentId || null,
      }),
    );
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Failed to mint Grok voice session',
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
  }
};
