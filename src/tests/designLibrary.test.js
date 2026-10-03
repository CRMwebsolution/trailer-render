import test from 'node:test';
import assert from 'node:assert/strict';
import { DesignLibrary } from '../core/DesignLibrary.js';
const memoryStorage = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };
test('named designs round-trip independently from recovery and sanitize inputs', () => {
  const library = new DesignLibrary(memoryStorage());
  const saved = library.save('  My trailer  ', { bedLengthFt: 22 }, 'javascript:alert(1)');
  library.saveRecovery({ bedLengthFt: 28 });
  assert.equal(library.list()[0].name, 'My trailer');
  assert.equal(library.list()[0].config.bedLengthFt, 22);
  assert.equal(library.list()[0].thumbnail, '');
  assert.equal(library.recover().bedLengthFt, 28);
  library.remove(saved.id); assert.equal(library.list().length, 0);
});
test('malformed storage and quota failures do not silently claim a successful save', () => {
  const broken = new DesignLibrary({ getItem: () => '{bad', setItem: () => { throw new Error('Quota'); } });
  assert.deepEqual(broken.list(), []); assert.equal(broken.recover(), null);
  assert.throws(() => broken.saveRecovery({}), /full or blocked/);
});
