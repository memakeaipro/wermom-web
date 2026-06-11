// V37: contact.html form had no action/handler — messages went nowhere
// (WEB-AUDIT #8). Same-origin POST -> Supabase via service role, with a crude
// rate limit (max 5 messages per email per hour).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://wermom.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.WEB_SUPABASE_URL;
  const key = process.env.WEB_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[contact-submit] missing Supabase env');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const b = req.body || {};
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 320) : '';
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 5000) : '';
  const name = (typeof b.name === 'string' ? b.name.trim().slice(0, 200) : null) || null;
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (message.length < 2) return res.status(400).json({ error: 'Message required' });

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    // Rate limit: max 5 per email per hour.
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const cr = await fetch(
      `${url}/rest/v1/web_contact_messages?email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(oneHourAgo)}&select=id`,
      { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = cr.headers.get('content-range') || '';
    const total = parseInt(range.split('/')[1], 10);
    if (!Number.isNaN(total) && total >= 5) {
      return res.status(429).json({ error: 'Too many messages — please try again later' });
    }

    const r = await fetch(`${url}/rest/v1/web_contact_messages`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[contact-submit] supabase error', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Storage error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[contact-submit] error', e && e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
};
