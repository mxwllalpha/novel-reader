import { novels, totalNovels, totalChapters } from '../src/data/novels.ts';
import { writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const siteUrl = process.env.PUBLIC_SITE_URL || 'https://novel-reader.pages.dev';

async function generateSitemap() {
  const pages = [
    { url: '', changefreq: 'daily', priority: 1.0 },
    { url: '/popular', changefreq: 'daily', priority: 0.9 },
    { url: '/latest', changefreq: 'daily', priority: 0.9 },
    { url: '/completed', changefreq: 'weekly', priority: 0.8 },
    { url: '/search', changefreq: 'monthly', priority: 0.6 },
  ];

  // Add all genre pages
  const allGenres = new Set();
  novels.forEach(novel => {
    novel.genres.forEach(genre => allGenres.add(genre));
  });

  allGenres.forEach(genre => {
    const slug = genre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    pages.push({
      url: `/genre/${slug}`,
      changefreq: 'weekly',
      priority: 0.7
    });
  });

  // Add all novel pages
  novels.forEach(novel => {
    pages.push({
      url: `/novel/${novel.id}`,
      changefreq: novel.status === 'Ongoing' ? 'weekly' : 'monthly',
      priority: novel.status === 'Ongoing' ? 0.7 : 0.5
    });

    // Add all chapter pages
    novel.chapters.forEach(chapter => {
      pages.push({
        url: `/novel/${novel.id}/${chapter.id}`,
        changefreq: 'monthly',
        priority: 0.5
      });
    });
  });

  // Generate XML sitemap
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages.map(page => `  <url>
    <loc>${siteUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Write to dist directory
  const distDir = join(__dirname, '../dist');
  await mkdir(distDir, { recursive: true });
  await writeFile(join(distDir, 'sitemap.xml'), xml);

  console.log(`✓ Generated sitemap.xml with ${pages.length} URLs`);
  console.log(`  - ${totalNovels} novels`);
  console.log(`  - ${allGenres.size} genres`);
  console.log(`  - ${totalChapters} chapters`);
}

generateSitemap().catch(console.error);
