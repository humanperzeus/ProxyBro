// ProxyBro — Creem license-validation Worker (Cloudflare Workers, free tier).
// NOT part of the extension. Holds the secret Creem API key SERVER-SIDE so it never
// ships in the extension JS (Creem's own security requirement).
//
// Deploy:
//   1. dash.cloudflare.com -> Workers & Pages -> Create -> paste this file.
//   2. Settings -> Variables and Secrets -> add a SECRET named CREEM_API_KEY
//      (use the creem_test_... key while testing, the live key for production).
//   3. Deploy -> copy the Worker URL -> set CREEM_VALIDATE_URL = "<that URL>/validate"
//      in popup.js.
//
// The extension POSTs { key, instanceId }. We ACTIVATE the key with Creem (this both proves
// the key is real + active AND registers this install against the activation limit), then
// return { valid }. Verified against docs.creem.io: POST /v1/licenses/activate, body
// { key, instance_name }, response field `status` in active|inactive|expired|disabled.
// If activation returns 400, Creem may expect { license_key, instance_id } instead — swap
// the two field names below.

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });

    let key = '';
    let instanceName = 'proxybro';
    try {
      const b = (await request.json()) || {};
      key = (b.key || '').trim();
      if (b.instanceId) instanceName = String(b.instanceId);
    } catch (e) {}
    if (!key) return Response.json({ valid: false, error: 'no key' }, { headers: cors });

    const apiKey = env.CREEM_API_KEY || '';
    const base = apiKey.startsWith('creem_test_') ? 'https://test-api.creem.io' : 'https://api.creem.io';

    try {
      const r = await fetch(base + '/v1/licenses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ key: key, instance_name: instanceName })
      });
      const d = await r.json().catch(() => ({}));
      const valid = !!(d && d.status === 'active');
      return Response.json({ valid: valid, status: (d && d.status) || null }, { headers: cors });
    } catch (e) {
      return Response.json({ valid: false, error: 'creem unreachable' }, { headers: cors });
    }
  }
};
