const http = require('http');
const fs = require('fs');
const path = require('path');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const ROOT = '/home/user/stripworld';
const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1200, 1399, 1400, 1440, 1920];
const PAGES = [
  'index.html',
  'how-to-get-50-free-tokens/index.html',
  'is-stripchat-free/index.html',
  'free-token-scams-and-hacks-warning/index.html',
  'vpn-geo-blocks-warning/index.html',
  'free-live-cam-content/index.html',
  'tokens-explained/index.html',
  'faq/index.html',
  'editorial-policy/index.html',
];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => server.listen(8096, '0.0.0.0', r));
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
    executablePath: await chromium.executablePath(),
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/pwlibs/lib' },
    headless: 'shell', protocolTimeout: 60000,
  });

  /* ---------- 1. horizontal overflow matrix ---------- */
  const matrix = {};
  for (const page of PAGES) {
    matrix[page] = {};
    for (const w of WIDTHS) {
      const p = await browser.newPage();
      await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
      // Block the sandbox-blocked image host so it can't pollute results
      await p.setRequestInterception(true);
      p.on('request', r => (r.url().includes('imgur.com') ? r.abort() : r.continue()));
      await p.goto(`http://127.0.0.1:8096/${page}`, { waitUntil: 'domcontentloaded' });
      matrix[page][w] = await p.evaluate(() => {
        const de = document.documentElement;
        const over = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          let scroller = false;
          for (let a = el.parentElement; a; a = a.parentElement) {
            if (['auto', 'scroll'].includes(getComputedStyle(a).overflowX)) { scroller = true; break; }
          }
          if (scroller) continue;
          if (r.right > de.clientWidth + 1 || r.left < -1) {
            over.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 40), right: Math.round(r.right) });
          }
        }
        return { overflow: de.scrollWidth - de.clientWidth, offenders: over.length, sample: over.slice(0, 3) };
      });
      await p.close();
    }
  }

  /* ---------- 2. interaction + no-JS checks ---------- */
  const checks = [];
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', r => (r.url().includes('imgur.com') ? r.abort() : r.continue()));
  await page.goto('http://127.0.0.1:8096/index.html', { waitUntil: 'domcontentloaded' });

  await page.click('.mobile-nav-toggle');
  await new Promise(r => setTimeout(r, 350));
  const open = await page.evaluate(() => {
    const m = document.querySelector('.nav-menu');
    return {
      shown: getComputedStyle(m).display !== 'none',
      aria: document.querySelector('.mobile-nav-toggle').getAttribute('aria-expanded'),
      links: m.querySelectorAll('a').length,
      barH: Math.round(document.getElementById('stickyPromoBar').getBoundingClientRect().height),
      pad: parseFloat(getComputedStyle(document.body).paddingBottom),
    };
  });
  checks.push(['mobile nav opens on tap', open.shown]);
  checks.push(['aria-expanded=true when open', open.aria === 'true']);
  checks.push(['all 9 nav links rendered', open.links === 9]);
  checks.push([`sticky bar ${open.barH}px, body padding ${open.pad}px >= bar`, open.pad >= open.barH]);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));
  const shut = await page.evaluate(() => ({
    shown: getComputedStyle(document.querySelector('.nav-menu')).display !== 'none',
    aria: document.querySelector('.mobile-nav-toggle').getAttribute('aria-expanded'),
  }));
  checks.push(['Escape closes nav + syncs aria', !shut.shown && shut.aria === 'false']);

  for (const [w, label] of [[375, 'mobile'], [1280, 'desktop']]) {
    const pj = await browser.newPage();
    await pj.setJavaScriptEnabled(false);
    await pj.setViewport({ width: w, height: 800 });
    await pj.setRequestInterception(true);
    pj.on('request', r => (r.url().includes('imgur.com') ? r.abort() : r.continue()));
    await pj.goto('http://127.0.0.1:8096/index.html', { waitUntil: 'domcontentloaded' });
    const r = await pj.evaluate(() => ({
      navShown: getComputedStyle(document.querySelector('.nav-menu')).display !== 'none',
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      title: document.title.length,
    }));
    checks.push([`no-JS ${label}: nav visible`, r.navShown]);
    checks.push([`no-JS ${label}: no overflow`, r.overflow === 0]);
    await pj.close();
  }

  /* ---------- 3. indexability sanity ---------- */
  const p3 = await browser.newPage();
  await p3.setRequestInterception(true);
  p3.on('request', r => (r.url().includes('imgur.com') ? r.abort() : r.continue()));
  for (const f of PAGES) {
    await p3.goto(`http://127.0.0.1:8096/${f}`, { waitUntil: 'domcontentloaded' });
    const seo = await p3.evaluate(() => {
      const raw = document.documentElement.outerHTML;
      return {
        noindex: /content=["'][^"']*noindex/i.test(document.querySelector('meta[name=robots]')?.content || ''),
        robotsMeta: (document.querySelector('meta[name=robots]')?.content || '').slice(0, 22),
        canonical: document.querySelector('link[rel=canonical]')?.href || '',
        h1: document.querySelectorAll('h1').length,
        viewport: !!document.querySelector('meta[name=viewport]'),
        titleLen: document.title.length,
        descLen: (document.querySelector('meta[name=description]')?.content || '').length,
        jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
        internalLinks: [...document.querySelectorAll('a[href]')].filter(a => {
          const h = a.getAttribute('href');
          return h && !/^https?:/.test(h) && !h.startsWith('#');
        }).length,
      };
    });
    checks.push([`${f.split('/')[0] || 'index'}: no noindex (${seo.robotsMeta}…)`, !seo.noindex && seo.robotsMeta.startsWith('index, follow')]);
    checks.push([`${f.split('/')[0] || 'index'}: canonical set`, /^https:\/\//.test(seo.canonical)]);
    checks.push([`${f.split('/')[0] || 'index'}: exactly 1 h1, viewport, jsonld`, seo.h1 === 1 && seo.viewport && seo.jsonld >= 1]);
    checks.push([`${f.split('/')[0] || 'index'}: title ${seo.titleLen}ch, desc ${seo.descLen}ch`, seo.titleLen <= 65 && seo.descLen <= 170]);
  }
  await p3.close();

  await browser.close();
  server.close();

  /* ---------- report ---------- */
  console.log('HORIZONTAL OVERFLOW (px) — 0 = content fits the screen\n');
  console.log('PAGE'.padEnd(42) + WIDTHS.map(w => String(w).padStart(6)).join(''));
  console.log('-'.repeat(42 + 6 * WIDTHS.length));
  let overflowCells = 0;
  for (const [pg, byW] of Object.entries(matrix)) {
    console.log(pg.padEnd(42) + WIDTHS.map(w => String(byW[w].overflow).padStart(6)).join(''));
    for (const w of WIDTHS) {
      if (byW[w].overflow > 0 || byW[w].offenders > 0) {
        overflowCells++;
        console.log(`   ! ${pg} @${w}: overflow=${byW[w].overflow} offenders=${JSON.stringify(byW[w].sample)}`);
      }
    }
  }
  console.log();
  console.log(overflowCells === 0
    ? `PASS  0px overflow on ${PAGES.length} pages x ${WIDTHS.length} widths = ${PAGES.length * WIDTHS.length} combinations`
    : `FAIL  ${overflowCells} combinations overflow`);

  console.log('\nFUNCTIONAL & SEO CHECKS');
  let failed = 0;
  for (const [name, ok] of checks) {
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  console.log();
  console.log(failed === 0 ? `ALL ${checks.length} CHECKS PASSED` : `${failed}/${checks.length} CHECKS FAILED`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
