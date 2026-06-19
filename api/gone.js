// HTTP 410 Gone responder for permanently-removed spam pages.
// WO 2026-06-18 spam-limbo-cleanup. Deleted /blogs/*.html paths are rewritten
// here via vercel.json so Google sees a strong "permanently removed" signal.
module.exports = (req, res) => {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="robots" content="noindex"><title>410 Gone</title></head><body>' +
    '<h1>410 Gone</h1><p>This page has been permanently removed.</p>' +
    '<p><a href="/blog/">Browse current articles</a></p></body></html>');
};
