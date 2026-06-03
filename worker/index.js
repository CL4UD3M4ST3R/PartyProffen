'use strict';

/* ============================================================
   partyproffen-form — Cloudflare Worker
   Env secrets required:
     TURNSTILE_SECRET  — Cloudflare Turnstile secret key
     RESEND_API_KEY    — Resend API key
   ============================================================ */

const RATE_LIMIT_MAX    = 3;
const RATE_LIMIT_WINDOW = 30 * 60 * 1000; // 30 minutes in ms
const rateLimitMap      = new Map();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://partyproffen.no',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/* --- Rate limiting ----------------------------------------- */
function checkRateLimit(ip) {
  const now  = Date.now();
  const key  = ip || 'unknown';

  // Prune old entries across all IPs
  for (const [k, timestamps] of rateLimitMap) {
    const fresh = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (fresh.length === 0) rateLimitMap.delete(k);
    else rateLimitMap.set(k, fresh);
  }

  const timestamps = rateLimitMap.get(key) || [];
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  rateLimitMap.set(key, [...timestamps, now]);
  return true;
}

/* --- Turnstile verification --------------------------------- */
async function verifyTurnstile(token, ip, secret) {
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip || '',
  });
  const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  return data.success === true;
}

/* --- Email via Resend --------------------------------------- */
async function sendEmails(fields, apiKey) {
  const { navn, epost, telefon, dato, arrangement, pakke, melding } = fields;

  const rows = [
    ['Navn',         navn],
    ['E-post',       epost],
    ['Telefon',      telefon      || '—'],
    ['Dato',         dato         || '—'],
    ['Arrangement',  arrangement  || '—'],
    ['Tjeneste',     pakke        || '—'],
    ['Melding',      melding      || '—'],
  ].map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#999;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#fff">${v}</td></tr>`).join('');

  const internalHtml = `
    <div style="background:#0d0d0d;padding:32px;font-family:sans-serif;border-radius:8px">
      <h2 style="color:#00d4ff;margin:0 0 24px">Ny forespørsel — PartyProffen</h2>
      <table style="border-collapse:collapse;width:100%;background:#1a1a1a;border-radius:6px;overflow:hidden">
        ${rows}
      </table>
      <p style="color:#666;font-size:12px;margin-top:24px">Sendt via partyproffen.no</p>
    </div>`;

  const confirmHtml = `
    <div style="background:#0d0d0d;padding:32px;font-family:sans-serif;border-radius:8px">
      <h2 style="color:#00d4ff;margin:0 0 16px">Takk for din henvendelse, ${navn}!</h2>
      <p style="color:#ccc;line-height:1.6">Vi har mottatt forespørselen din og tar kontakt innen 24 timer.</p>
      <p style="color:#ccc;line-height:1.6">Har du spørsmål i mellomtiden kan du svare på denne e-posten eller ringe oss på <strong style="color:#fff">+47 900 47 050</strong>.</p>
      <p style="color:#666;font-size:12px;margin-top:32px">— PartyProffen</p>
    </div>`;

  const send = (to, subject, html) =>
    fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: 'PartyProffen <noreply@partyproffen.no>', to, subject, html }),
    });

  await Promise.all([
    send(['kontakt@partyproffen.no'], `Ny forespørsel fra ${navn}`, internalHtml),
    send([epost], 'Vi har mottatt din forespørsel — PartyProffen', confirmHtml),
  ]);
}

/* --- Main handler ------------------------------------------ */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ success: false, message: 'Method not allowed' }, 405);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '';

    // Rate limit
    if (!checkRateLimit(ip)) {
      return json({ success: false, message: 'For mange forespørsler. Prøv igjen senere.' }, 429);
    }

    let fd;
    try { fd = await request.formData(); }
    catch { return json({ success: false, message: 'Ugyldig skjemadata' }, 400); }

    // Honeypot
    if (fd.get('botcheck')) {
      return json({ success: true }); // silent drop
    }

    // Turnstile server-side verification
    const tsToken = fd.get('cf-turnstile-response') || '';
    if (!tsToken) {
      return json({ success: false, message: 'Sikkerhetsverifisering feilet' }, 403);
    }
    const tsOk = await verifyTurnstile(tsToken, ip, env.TURNSTILE_SECRET);
    if (!tsOk) {
      return json({ success: false, message: 'Sikkerhetsverifisering feilet' }, 403);
    }

    // Required fields
    const navn  = (fd.get('navn')  || '').trim();
    const epost = (fd.get('epost') || '').trim();
    if (!navn || !epost) {
      return json({ success: false, message: 'Navn og e-post er påkrevd' }, 400);
    }

    // Send emails
    try {
      await sendEmails({
        navn,
        epost,
        telefon:     (fd.get('telefon')     || '').trim(),
        dato:        (fd.get('dato')         || '').trim(),
        arrangement: (fd.get('arrangement')  || '').trim(),
        pakke:       (fd.get('pakke')        || '').trim(),
        melding:     (fd.get('melding')      || '').trim(),
      }, env.RESEND_API_KEY);
    } catch (err) {
      console.error('Resend feil:', err);
      return json({ success: false, message: 'Klarte ikke sende e-post. Prøv igjen.' }, 500);
    }

    return json({ success: true });
  },
};
