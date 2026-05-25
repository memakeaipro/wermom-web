const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const baseUrl = 'https://wermom.com';
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/app.html', priority: '0.9', changefreq: 'weekly' },
    { url: '/blog.html', priority: '0.9', changefreq: 'daily' },
  ];

  // Scan content directories
  const root = path.join(process.cwd());
  const scanDir = (dirName, urlPrefix, priority) => {
    try {
      const dir = path.join(root, dirName);
      return fs.readdirSync(dir)
        .filter(f => f.endsWith('.html'))
        .map(f => ({
          url: `/${urlPrefix}/${f}`,
          priority,
          changefreq: 'weekly'
        }));
    } catch { return []; }
  };

  const blogs = scanDir('blogs', 'blogs', '0.8');
  const comparisons = scanDir('compare', 'compare', '0.7');
  const articles = scanDir('articles', 'articles', '0.7');

  const allPages = [...staticPages, ...blogs, ...comparisons, ...articles];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(xml);
};
