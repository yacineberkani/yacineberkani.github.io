// Capture le HTML rendu (normalisé) des zones de contenu + captures d'écran.
// Usage : node scripts/snapshot.mjs <url> <dossier-sortie>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const ZONES = ['#navbar', '#home', '#about', '#skills', '#experience', '#projects', '.contact-info', 'footer'];

const browser = await chromium.launch();
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { viewport: { width: 390, height: 844 } }]]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => localStorage.setItem('portfolio-theme', t), theme);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => !document.getElementById('preloader') && document.querySelectorAll('.project-card').length > 0, null, { timeout: 15000 });
    await page.evaluate(() => { const t = document.getElementById('typedText'); if (t) t.textContent = ''; });
    if (name === 'desktop' && theme === 'light') {
      const html = await page.evaluate((zones) => zones.map(z => {
        const el = document.querySelector(z);
        const clone = el.cloneNode(true);
        clone.querySelectorAll('*').forEach(n => { n.classList.remove('aos-init', 'aos-animate'); if (!n.className) n.removeAttribute('class'); });
        return '=== ' + z + '\n' + clone.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/> </g, '>\n<');
      }).join('\n\n'), ZONES);
      writeFileSync(`${out}/dom.html`, html);
      writeFileSync(`${out}/title.txt`, await page.title());
    }
    await page.screenshot({ path: `${out}/${name}-${theme}.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
console.log('ok', out);
