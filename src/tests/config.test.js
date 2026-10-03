import test from 'node:test';
import assert from 'node:assert/strict';
import { StateStore } from '../core/StateStore.js';
import { normalizeConfig, configurationURL, configurationFromURL } from '../core/config.js';

test('a deck-over trailer can return directly to standard fenders', () => {
  const store = new StateStore();
  store.update({ fenderStyle: 'deck_over' });
  assert.equal(store.getState().trailerWidthIn, 102);
  store.update({ fenderStyle: 'regular' });
  assert.equal(store.getState().trailerWidthIn, 83);
  assert.equal(store.getState().fenderStyle, 'regular');
});
test('dual-wheel classes normalize the platform and deck height', () => {
  const store = new StateStore();
  for (const payloadClass of ['20K', '25K']) {
    store.update({ payloadClass, trailerWidthIn: 76, fenderStyle: 'regular' });
    assert.equal(store.getState().trailerWidthIn, 102);
    assert.equal(store.getState().fenderStyle, 'deck_over');
    assert(store.getMetrics().deckHeightIn >= 34);
  }
});
test('cargo cannot inherit a hidden gooseneck or steel-floor setting', () => {
  const store = new StateStore({ hitchStyle: 'gooseneck', deckMaterial: 'diamond_plate' });
  store.update({ trailerType: 'cargo' });
  assert.equal(store.getState().hitchStyle, 'bumper_pull');
  assert.equal(store.getState().deckMaterial, 'wood');
  assert.equal(store.getMetrics().couplerHeightIn, 19);
});
test('invalid shared input never creates non-finite dimensions', () => {
  const config = normalizeConfig({ bedLengthFt: 'bad', rampLengthFt: Infinity,
    trailerWidthIn: -20, trailerType: 'invalid', finishColor: 'url(example)', decalText: 'a'.repeat(500) });
  assert.equal(config.bedLengthFt, 20);
  assert.equal(config.rampLengthFt, 6);
  assert.equal(config.trailerWidthIn, 83);
  assert.equal(config.trailerType, 'flatbed');
  assert.equal(config.finishColor, '#27272a');
  assert.equal(config.decalText.length, 28);
});
test('a shared design round-trips all configuration fields without unrelated query parameters', () => {
  const config = normalizeConfig({ trailerType: 'dump', dumpBedPosition: 'raised',
    finishColor: '#991b1b', decalText: 'A & B + "Rental"', showTowTruck: true, renderQuality: 'low' });
  const url = configurationURL(config, 'https://example.com/studio?token=discard-me');
  assert.deepEqual(configurationFromURL(url), config);
  assert(!url.includes('discard-me'));
});
test('malformed and oversized shared designs are rejected', () => {
  assert.throws(() => configurationFromURL('https://example.com/?config=%7Bbad'));
  assert.throws(() => configurationFromURL('https://example.com/?config=[]'));
  assert.throws(() => configurationFromURL(`https://example.com/?config=${'a'.repeat(4001)}`));
});
test('no-op changes do not rebuild the scene through subscriptions', () => {
  const store = new StateStore();
  let notifications = 0;
  store.subscribe(() => notifications++);
  store.update({ bedLengthFt: 20 });
  assert.equal(notifications, 1);
  store.update({ bedLengthFt: 21 });
  assert.equal(notifications, 2);
});
test('standing ramps normalize to deployed when switching to slide-in', () => {
  const store = new StateStore({ rampStyle: 'fold_flat', rampPosition: 'standing' });
  store.update({ rampStyle: 'slide_in' });
  assert.equal(store.getState().rampPosition, 'deployed');
});
