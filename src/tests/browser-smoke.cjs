const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const directory = '/tmp/trailer-checks';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1', '--port', '5173'], { stdio: 'ignore' });
let browser;
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
(async () => {
  await fs.mkdir(directory, { recursive: true });
  for (let count = 0; count < 80; count++) {
    try { await fetch('http://127.0.0.1:5173/'); break; } catch { await pause(100); }
  }
  browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const range = (id, value) => page.evaluate(({ id, value }) => {
    const element = document.getElementById(id); element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, { id, value });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  assert(!(await page.locator('#viewport-status').isVisible()));
  await page.selectOption('#select-payload-class', '20K'); await page.locator('#btn-undo').click();
  assert.equal(await page.locator('#select-trailer-width').inputValue(), '83'); await page.locator('#btn-redo').click();
  assert.equal(await page.locator('#select-trailer-width').inputValue(), '102'); await page.locator('#btn-reset-design').click();
  await page.selectOption('#select-trailer-type', 'dump'); await range('slider-dump-angle', 21);
  assert.equal(await page.locator('#val-dump-angle').textContent(), '21°');
  await page.selectOption('#select-trailer-type', 'cargo'); await range('slider-cargo-door', 50);
  assert.equal(await page.locator('#val-cargo-door').textContent(), '50%');
  await page.locator('.load-settings summary').click(); await page.selectOption('#select-load-preset', 'car');
  assert((await page.locator('#load-fit-status').textContent()).includes('fits the')); await page.locator('#check-cargo-cutaway').check();
  await page.locator('#input-load-height').fill('100'); await page.locator('#input-load-height').press('Tab');
  assert((await page.locator('#load-fit-detail').textContent()).includes('exceeds opening'));
  await page.locator('#input-load-height').fill('60'); await page.locator('#input-load-height').press('Tab');
  if (await page.locator('#input-load-weight').count()) {
    await page.locator('#input-load-weight').fill('20000'); await page.locator('#input-load-weight').press('Tab'); await range('slider-load-center', 100);
    assert((await page.locator('#load-balance-warning').textContent()).includes('negative'));
    await page.selectOption('#select-trailer-type', 'dump'); await range('slider-dump-angle', 21);
    assert((await page.locator('#load-balance-status').textContent()).includes('Lower'));
  }
  await page.locator('#btn-reset-design').click();
  await page.locator('.inspect-settings summary').click(); await page.selectOption('#select-inspect-part', 'jack');
  assert.equal(await page.locator('#part-title').textContent(), 'Tongue jack');
  await page.locator('#btn-part-settings').click(); assert(await page.locator('#slider-jack-extension').isVisible()); await page.locator('#btn-clear-part').click();
  await page.locator('.measurement-settings summary').click(); await page.selectOption('#select-measurement-mode', 'hitch'); await page.selectOption('#select-measurement-units', 'metric');
  assert((await page.locator('#measurement-summary').textContent()).includes('Hitch to axle'));
  await page.locator('#btn-compare-design').click(); assert((await page.locator('#comparison-status').textContent()).startsWith('0 specifications'));
  await page.locator('#btn-close-comparison').click(); await range('slider-bed-length', 24); await page.locator('#btn-compare-design').click();
  assert((await page.locator('#comparison-rows tr').filter({ hasText: 'Bed length' }).textContent()).includes('+4 ft'));
  await page.locator('#check-changed-only').check(); assert.equal(await page.locator('#comparison-rows tr[data-changed="false"]').count(), 0); await page.locator('#btn-close-comparison').click();
  await page.locator('.presentation-settings summary').click();
  const sheetDownload = page.waitForEvent('download'); await page.locator('#btn-export-spec-sheet').click();
  const sheet = await sheetDownload; const html = await fs.readFile(await sheet.path(), 'utf8');
  const sheetPage = await browser.newPage(); await sheetPage.setContent(html); assert.equal(await sheetPage.locator('img').count(), 4);
  assert(await sheetPage.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth === 1280)));
  const href = await sheetPage.locator('a[download="trailer-design.json"]').getAttribute('href');
  assert.equal(JSON.parse(decodeURIComponent(href.slice(href.indexOf(',') + 1))).config.bedLengthFt, 24);
  await sheetPage.pdf({ path: directory + '/spec-sheet.pdf', format: 'Letter', printBackground: true }); await sheetPage.screenshot({ path: directory + '/spec-sheet.png', fullPage: true }); await sheetPage.close();
  const modelDownload = page.waitForEvent('download'); await page.locator('#btn-export-glb').click();
  const model = await modelDownload; const modelBuffer = await fs.readFile(await model.path()); assert.equal(modelBuffer.toString('utf8', 0, 4), 'glTF');
  const modelJSON = JSON.parse(modelBuffer.toString('utf8', 20, 20 + modelBuffer.readUInt32LE(12)).trim()); assert(modelJSON.nodes.some(node => node.name === 'Safety_Chain_Links'));
  await page.locator('.vehicle-settings summary').click(); await page.selectOption('#select-render-quality', 'low'); assert((await page.locator('#quality-status').textContent()).includes('shadows off'));
  await page.locator('#input-truck-file').setInputFiles(await model.path()); await page.waitForFunction(() => document.getElementById('truck-btn-text').textContent === 'Custom truck');
  await page.locator('#btn-reset-truck').click(); assert(!(await page.locator('#custom-truck-controls').isVisible()));
  if (await page.locator('#input-truck-wheelbase').count()) {
    await page.locator('#input-truck-wheelbase').fill('180'); await page.locator('#input-truck-wheelbase').press('Tab');
    await page.locator('#btn-toggle-truck').click(); await page.locator('#btn-toggle-truck').click();
  }
  if (await page.locator('#btn-maneuver-demo').count()) {
    await page.locator('#btn-maneuver-demo').click(); assert(await page.locator('#maneuver-dialog').isVisible());
    await page.locator('#check-maneuver-reverse').check(); await page.locator('#btn-maneuver-play').click(); await pause(200); await page.locator('#btn-close-maneuver').click();
  }
  await page.screenshot({ path: directory + '/desktop.png' });
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 }); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.reload({ waitUntil: 'networkidle' }); assert.equal(await page.locator('#slider-bed-length').inputValue(), '24');
  await page.screenshot({ path: directory + '/mobile.png', fullPage: true }); assert.deepEqual(errors, []);
  console.log('PASS history, poses, fit, inspection, measurements, comparison, printable exports, GLB, imports, quality, responsive layout and recovery.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.kill(); });
