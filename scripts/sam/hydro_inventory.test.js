#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tool = require('./hydro_inventory.js');
const scriptPath = path.join(__dirname, 'hydro_inventory.js');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hydro-inventory-test-'));

function writeFixture(name, source) {
  const filePath = path.join(tempRoot, name);
  fs.writeFileSync(filePath, source, 'utf8');
  return filePath;
}

function runCli(args) {
  return childProcess.spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' });
}

function fixtureGeo(rivers) {
  return `window.HYDRO_DATA = ${JSON.stringify({
    rivers,
    lakes: [{ name: 'Lake A', rank: 2, rings: [[[10, 10], [11, 10], [10, 11]]] }],
    labels: [{ zh: '河甲', en: 'River A', coord: [1, 1], appear: 10, vanish: 20 }],
  })};`;
}

function fixtureMap() {
  return `window.CORRIDOR_DATA = ${JSON.stringify([
    { key: 'road_a', kind: 'road', title: 'Road A', span: [10, 20], segments: [[[0, 0], [2, 2]]] },
  ])};`;
}

function readOutput(dir, name) {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

function testCliParameterFailures(geo, map) {
  const missing = runCli(['--geo', geo, '--map', map, '--out-dir', path.join(tempRoot, 'missing')]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /missing required parameter: --margin-deg/);
  const unknown = runCli(['--geo', geo, '--map', map, '--out-dir', path.join(tempRoot, 'unknown'), '--margin-deg', '0', '--bad', 'x']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown parameter: --bad/);
}

function testInvalidDataDoesNotWrite(map) {
  const badGeo = writeFixture('bad-geo.js', 'window.NOT_HYDRO_DATA = {};');
  const outDir = path.join(tempRoot, 'bad-output');
  const result = runCli(['--geo', badGeo, '--map', map, '--out-dir', outDir, '--margin-deg', '0']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HYDRO_DATA is missing/);
  assert.equal(fs.existsSync(outDir), false, 'invalid input must not create output files');
}

function testDeterminismAndFingerprints(geo, map, rivers) {
  const firstDir = path.join(tempRoot, 'first');
  const secondDir = path.join(tempRoot, 'second');
  const forgedDir = path.join(tempRoot, 'forged');
  const options = { geoPath: geo, mapPath: map, marginDeg: 0, outDir: firstDir };
  tool.run(options);
  tool.run({ ...options, outDir: secondDir });
  for (const name of ['hydro_inventory.json', 'corridor_inventory.json', 'coherence_probe.json', 'P0a-1_INVENTORY.md']) {
    assert.equal(readOutput(firstDir, name), readOutput(secondDir, name), `${name} must be byte-identical`);
  }

  fs.mkdirSync(forgedDir, { recursive: true });
  fs.writeFileSync(path.join(forgedDir, 'hydro_inventory.json'), JSON.stringify({ meta: { git_head: 'FORGED-GIT-HEAD' } }));
  tool.run({ ...options, outDir: forgedDir });
  assert.deepEqual(JSON.parse(readOutput(forgedDir, 'hydro_inventory.json')).meta, JSON.parse(readOutput(firstDir, 'hydro_inventory.json')).meta, 'pre-existing output metadata must not affect regeneration');

  const original = tool.buildHydroEntries(JSON.parse(JSON.stringify({ rivers, lakes: [], labels: [] })));
  const mutatedRivers = JSON.parse(JSON.stringify(rivers));
  mutatedRivers[0].lines[0][0][0] = 99;
  const mutated = tool.buildHydroEntries({ rivers: mutatedRivers, lakes: [], labels: [] });
  assert.notEqual(original[0].fp, mutated[0].fp, 'changed coordinate must change that entry fp');
  assert.equal(original[1].fp, mutated[1].fp, 'changed coordinate must not change other entry fp');

  const inserted = { name: 'River New', rank: 3, lines: [[[7, 7], [8, 8]]] };
  const withInsertion = tool.buildHydroEntries({ rivers: [rivers[0], inserted, rivers[1]], lakes: [], labels: [] });
  const originalByName = new Map(original.map((entry) => [entry.name, entry.legacy_id]));
  for (const entry of withInsertion.filter((entry) => entry.name !== 'River New')) {
    assert.equal(entry.legacy_id, originalByName.get(entry.name), 'insertion must not change legacy_id');
  }
}

function testIntervalSemantics() {
  assert.equal(tool.isHydroVisible({ vanish: 1194 }, 1193), true);
  assert.equal(tool.isHydroVisible({ vanish: 1194 }, 1194), false);
  assert.equal(tool.isHydroVisible({ appear: 1194 }, 1194), true);
  assert.equal(tool.isCorridorVisible({ span: [605, 1292] }, 605), true);
  assert.equal(tool.isCorridorVisible({ span: [605, 1292] }, 1292), true);
  assert.equal(tool.isCorridorVisible({ span: [605, 1292] }, 1293), false);
}

function fixtureEntry(kind, name, source, appear = null, vanish = null) {
  const entry = tool.buildHydroEntries({
    rivers: kind === 'river' ? [{ name, rank: 1, lines: source, ...(appear === null ? {} : { appear }), ...(vanish === null ? {} : { vanish }) }] : [],
    lakes: kind === 'lake' ? [{ name, rank: 1, rings: source, ...(appear === null ? {} : { appear }), ...(vanish === null ? {} : { vanish }) }] : [],
    labels: [],
  })[0];
  return entry;
}

function fixtureLabel(en, coord, appear = 0, vanish = null) {
  return tool.buildHydroEntries({ rivers: [], lakes: [], labels: [{ zh: en, en, coord, ...(appear === null ? {} : { appear }), ...(vanish === null ? {} : { vanish }) }] })[0];
}

function pairingCandidates(label, geometry, marginDeg) {
  return tool.buildLabelPairing([label, geometry], marginDeg).pairings[0].candidates;
}

function testPairingRules() {
  const hongze = fixtureLabel('Hongze L.', [0, 0]);
  const khovsgol = fixtureEntry('lake', 'Khövsgöl Nuur', [[[0, 0], [1, 0], [0, 1]]]);
  assert.equal(pairingCandidates(hongze, khovsgol, 0).length, 1, 'distance can independently create a candidate');
  assert.deepEqual(pairingCandidates(hongze, khovsgol, 0)[0].pairing_basis, [{ rule: 'B', distance_deg: '0.0000' }], 'single-letter token must not trigger rule A');

  const yellow = fixtureLabel('Yellow R.', [0, 0]);
  const huang = fixtureEntry('river', 'Huang', [[[3, 0], [4, 0]]]);
  assert.deepEqual(pairingCandidates(yellow, huang, 0)[0].pairing_basis, [{ rule: 'A2', translations: [{ english: 'yellow', pinyin: 'huang' }] }], 'Yellow must pair with Huang through rule A2');

  const lShape = fixtureEntry('river', 'Far', [[[0, 0], [0, 10], [10, 10]]]);
  const inBboxButFar = fixtureLabel('Other', [5, 5]);
  assert.equal(pairingCandidates(inBboxButFar, lShape, 1).length, 0, 'bbox inclusion must not satisfy rule B when line distance exceeds margin');

  const sameIntervalFar = fixtureLabel('Same', [5, 5], 10, 20);
  const sameIntervalLine = fixtureEntry('river', 'Different', [[[0, 0], [0, 1]]], 10, 20);
  assert.equal(pairingCandidates(sameIntervalFar, sameIntervalLine, 1).length, 0, 'matching interval alone must not satisfy rule C');

  const parenthesized = fixtureLabel('Alpha (old name) Beta', [5, 5]);
  const beta = fixtureEntry('river', 'Beta', [[[0, 0], [0, 1]]]);
  assert.deepEqual(pairingCandidates(parenthesized, beta, 0)[0].pairing_basis, [{ rule: 'A', shared_tokens: ['beta'] }], 'text after parentheses must remain eligible for rule A');
}

function testBoundarySentinel(geo, map) {
  const sentinelMap = writeFixture('sentinel-map.js', `window.CORRIDOR_DATA = ${JSON.stringify([
    { key: 'open_road', kind: 'road', title: 'Open road', span: [10, 9999], segments: [[[0, 0], [2, 2]]] },
  ])};`);
  const outDir = path.join(tempRoot, 'sentinel');
  const result = tool.run({ geoPath: geo, mapPath: sentinelMap, marginDeg: 0, outDir });
  const sentinel = result.coherence.boundary_years.find((row) => row.year === 9999);
  assert.equal(sentinel.is_sentinel, true, '9999 must be marked as sentinel');
  assert.equal(sentinel.meaning, 'open_end');
  assert.equal(result.coherence.boundary_years.find((row) => row.year === 10).is_sentinel, false, 'ordinary boundary years must not be sentinels');
}

try {
  const rivers = [
    { name: 'River A', rank: 1, lines: [[[0, 0], [1, 1]]], appear: 10, vanish: 20 },
    { name: 'River B', rank: 2, lines: [[[2, 2], [3, 3]]] },
  ];
  const geo = writeFixture('geo.js', fixtureGeo(rivers));
  const map = writeFixture('map.js', fixtureMap());
  testCliParameterFailures(geo, map);
  testInvalidDataDoesNotWrite(map);
  testDeterminismAndFingerprints(geo, map, rivers);
  testIntervalSemantics();
  testPairingRules();
  testBoundarySentinel(geo, map);
  console.log('hydro_inventory.test.js: 14 required cases passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
