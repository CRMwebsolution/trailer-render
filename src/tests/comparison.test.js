import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDesigns } from '../core/designSummary.js';
import { buildPresentationHTML } from '../export/presentation.js';
test('comparison reports numeric differences with units and normalized platform changes', () => {
  const rows = compareDesigns({}, { bedLengthFt: 24, payloadClass: '20K' });
  assert.equal(rows.find(row => row.key === 'length').change, '+4 ft');
  assert.equal(rows.find(row => row.key === 'width').change, '+19 in');
  assert.equal(rows.find(row => row.key === 'hitch').changed, false);
});
test('presentation exports escape signage and reject injected image URLs', () => {
  const html = buildPresentationHTML({ title: '<script>bad()</script>', rows: [['Signage', '<img src=x onerror=bad()>']], views: [{ label: 'Bad', image: '" onload="bad()' }] });
  assert(!html.includes('<script>bad')); assert(!html.includes('<img src=x'));
  assert(html.includes('&lt;script&gt;')); assert(!html.includes('onload='));
});
