// V36: replaces the dead Railway backend (502 — every survey submission was
// silently lost). Writes to Supabase web_survey_submissions via PostgREST
// using the service role key (Vercel env). Zero npm dependencies (Node fetch).

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://wermom.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.WEB_SUPABASE_URL;
  const key = process.env.WEB_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[survey-submit] missing Supabase env');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const body = req.body || {};
  // Minimal boundary validation — the payload is a marketing-funnel survey.
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 320) : null;
  const submissionId = typeof body.submissionId === 'string' ? body.submissionId.slice(0, 64) : null;
  // Cap payload size (~64KB) so nobody can dump megabytes into the table.
  const raw = JSON.stringify(body);
  if (raw.length > 65536) return res.status(413).json({ error: 'Payload too large' });

  try {
    // on_conflict is required for Prefer: ignore-duplicates to dedup retries.
    const r = await fetch(`${url}/rest/v1/web_survey_submissions?on_conflict=submission_id`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // Dedup: retries with the same submission_id are ignored, still 2xx.
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ submission_id: submissionId, email, payload: body }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[survey-submit] supabase error', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Storage error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[survey-submit] error', e && e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
};
