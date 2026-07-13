import assert from 'node:assert/strict';
import {
  SESSION_VERSION,
  migrateSession,
  validateSession,
  buildBatchSessionObject,
  buildPlateRecord,
  syncDotIdCounterAcrossPlates,
} from '../session.js';

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\nColony Counter session (batch plates)');

test('migrates v1 flat session to plates[]', () => {
  const v1 = {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    imageName: 'plateA.tif',
    imageData: 'data:image/jpeg;base64,abc',
    originalSrc: 'data:image/png;base64,full',
    dots: [{ id: 1, x: 10, y: 20, radius: 12, color: '#fff', categoryId: 'cat-1' }],
    categories: [{ id: 'cat-1', label: 'WT', color: '#4A90D9' }],
    activeCategory: 'cat-1',
    dotRadius: 12,
    opacity: 0.7,
    cfu: { dilutionMode: 'preset', dilutionExponent: -3, customDilution: null, volumeMl: 0.1 },
  };
  const v2 = migrateSession(v1);
  assert.equal(v2.version, SESSION_VERSION);
  assert.equal(v2.plates.length, 1);
  assert.equal(v2.plates[0].imageData, v1.imageData);
  assert.equal(v2.plates[0].dots.length, 1);
  assert.equal(v2.plates[0].sampleName, 'plateA');
  assert.equal(v2.activePlateId, 'plate-1');
  assert.ok(validateSession(v1));
  assert.ok(validateSession(v2));
});

test('buildBatchSessionObject keeps all plates', () => {
  const p1 = buildPlateRecord({
    id: 'a',
    name: 'A',
    image: { src: 'data:1', name: 'a.jpg', naturalWidth: 10, naturalHeight: 10, displayWidth: 10, displayHeight: 10 },
    dots: [],
    activeCategory: 'cat-1',
    dotRadius: 12,
    opacity: 0.7,
    dilutionMode: 'preset',
    dilutionExponent: 2,
    customDilution: '',
    volumeMl: 0.1,
    meta: { sampleName: 'A', strain: 'S288C' },
  });
  const p2 = buildPlateRecord({
    id: 'b',
    name: 'B',
    image: { src: 'data:2', name: 'b.jpg', naturalWidth: 10, naturalHeight: 10, displayWidth: 10, displayHeight: 10 },
    dots: [{ id: 7, x: 1, y: 2, radius: 5, color: '#000', categoryId: 'cat-1' }],
    activeCategory: 'cat-1',
    dotRadius: 12,
    opacity: 0.7,
    dilutionMode: 'preset',
    dilutionExponent: 2,
    customDilution: '',
    volumeMl: 0.1,
    meta: { sampleName: 'B' },
  });
  const batch = buildBatchSessionObject({
    sessionName: 'exp-1',
    activePlateId: 'b',
    categories: [{ id: 'cat-1', label: 'WT', color: '#4A90D9' }],
    plates: [p1, p2],
  });
  assert.equal(batch.plates.length, 2);
  assert.equal(batch.activePlateId, 'b');
  assert.equal(batch.plates[0].strain, 'S288C');
  assert.equal(syncDotIdCounterAcrossPlates(batch.plates), 8);
});

test('rejects empty session', () => {
  assert.equal(validateSession(null), false);
  assert.equal(validateSession({ version: 2, plates: [] }), false);
});

console.log(process.exitCode ? '\ncolony session tests failed\n' : '\ncolony session tests passed\n');
