import test from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveQuality, initialQualityTier, qualitySettings } from '../core/AdaptiveQuality.js';
test('automatic quality responds to sustained slow motion, not one dropped frame', () => {
  const controller = new AdaptiveQuality();
  for (let i = 0; i < 60; i++) controller.sample(i === 20 ? 150 : 17);
  assert.equal(controller.tier, 'balanced');
  for (let i = 0; i < 60; i++) controller.sample(40);
  assert.equal(controller.tier, 'economy');
  for (let i = 0; i < 60; i++) controller.sample(40);
  assert.equal(controller.tier, 'minimal');
});
test('idle gaps and background pauses never lower automatic quality', () => {
  const controller = new AdaptiveQuality();
  for (let i = 0; i < 80; i++) { controller.sample(5000); controller.sample(200, false); }
  assert.equal(controller.tier, 'balanced');
  controller.reset('economy'); assert.equal(controller.samples.length, 0);
});
test('device hints choose a starting level and manual modes retain their settings', () => {
  assert.equal(initialQualityTier({ saveData: true }), 'economy');
  assert.equal(initialQualityTier({ deviceMemory: 8 }), 'balanced');
  assert.equal(qualitySettings('high', 'minimal').shadowSize, 4096);
  assert.equal(qualitySettings('low', 'balanced').shadowSize, 0);
  assert.equal(qualitySettings('auto', 'balanced', true).pixelCap, 1.25);
});
