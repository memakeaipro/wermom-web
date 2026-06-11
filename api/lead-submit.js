// V37: the app.html lead form stored leads in sessionStorage only — every
// marketing lead was lost on tab close (WEB-AUDIT #7). Same pattern as
// api/survey-submit.js: same-origin POST -> Supabase via service role.

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
    console.error('[lead-submit] missing Supabase env');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const b = req.body || {};
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 320) : '';
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null;
  const row = {
    email,
    name: clean(b.name, 200),
    phone: clean(b.phone, 40),
    country: clean(b.country, 100),
    source: clean(b.source, 100) || 'app.html',
  };

  try {
    const r = await fetch(`${url}/rest/v1/web_leads?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates', // repeat submits: still 2xx, one row
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[lead-submit] supabase error', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Storage error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[lead-submit] error', e && e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
};
