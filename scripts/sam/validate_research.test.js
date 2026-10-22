'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateDataset } = require('./research_contract.js');

const root = path.resolve(__dirname, '..', '..');
const fixtures = path.join(__dirname, 'fixtures', 'contract');
const cli = path.join(__dirname, 'validate_research.js');
const data = path.join(fixtures, 'valid_draft.geojson');
const sources = path.join(fixtures, 'sources.json');
const legacy = path.join(fixtures, 'legacy_inventory_min.json');
const realLegacy = path.join(root, 'docs', 'sam', 'audit', 'hydro_inventory.json');

function run(args) {
  return childProcess.spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
}
function standardArgs(dataset, inventory = legacy) {
  return ['--data', dataset, '--sources', sources, '--legacy-inventory', inventory];
}
function codes(stdout) {
  return new Set([...stdout.matchAll(/^ERROR (E_[A-Z_]+) /gm)].map((match) => match[1]));
}

const valid = run(standardArgs(data));
assert.equal(valid.status, 0, valid.stderr || valid.stdout);
assert.equal(codes(valid.stdout).size, 0, valid.stdout);
assert.match(valid.stdout, /^READ data=.* features=3 .*source_count=1 .*legacy_count=3 stage=draft synthetic=true$/m);

for (const name of fs.readdirSync(fixtures).filter((name) => /^invalid_e_[a-z_]+\.geojson$/.test(name)).sort()) {
  const expected = name.slice('invalid_'.length, -'.geojson'.length).toUpperCase();
  const result = run(standardArgs(path.join(fixtures, name)));
  assert.equal(result.status, 1, `${name}: ${result.stderr || result.stdout}`);
  assert.deepEqual(codes(result.stdout), new Set([expected]), `${name}: ${result.stdout}`);
}

const realInventory = run(standardArgs(data, realLegacy));
assert.equal(realInventory.status, 0, realInventory.stderr || realInventory.stdout);

assert.equal(run([]).status, 2, 'missing arguments must exit 2');
assert.equal(run([...standardArgs(data), '--unexpected']).status, 2, 'unknown argument must exit 2');
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'jsm-p0a2-'));
const malformedLegacy = path.join(tempDirectory, 'legacy.json');
fs.writeFileSync(malformedLegacy, JSON.stringify({ meta: {}, entries: [{}] }));
assert.equal(run(standardArgs(data, malformedLegacy)).status, 2, 'invalid legacy inventory must exit 2');
fs.rmSync(tempDirectory, { recursive: true, force: true });

const repeatOne = run(standardArgs(data));
const repeatTwo = run(standardArgs(data));
assert.equal(repeatOne.stdout, repeatTwo.stdout, 'stdout must be byte-for-byte deterministic');

const memoryDataset = JSON.parse(fs.readFileSync(data, 'utf8'));
memoryDataset.features[0].geometry.coordinates[0] = [200, 35];
const direct = validateDataset({ dataset: memoryDataset, sources: JSON.parse(fs.readFileSync(sources, 'utf8')), legacyInventory: JSON.parse(fs.readFileSync(legacy, 'utf8')) });
assert.deepEqual(new Set(direct.errors.map((error) => error.code)), new Set(['E_COORD']));

const documented = new Set([...fs.readFileSync(path.join(root, 'docs', 'sam', 'CONTRACT.md'), 'utf8').matchAll(/`(E_[A-Z_]+)`/g)].map((match) => match[1]));
const implemented = new Set(['E_TOP_SHAPE', 'E_SCHEMA_VERSION', 'E_REQUIRED', 'E_UNKNOWN_KEY', 'E_TYPE', 'E_ENUM', 'E_REGION', 'E_DUP_ID', 'E_INTERVAL', 'E_NULL_REASON', 'E_GEOM_ABSENT', 'E_GEOM_TYPE', 'E_EMPTY', 'E_COORD', 'E_REGION_BBOX', 'E_LINE', 'E_RING', 'E_SELF_INTERSECT', 'E_SOURCE_REF', 'E_LEGACY_REF', 'E_RELEASE']);
assert.deepEqual(documented, implemented, 'CONTRACT.md error-code table must match the implementation');

process.stdout.write(`PASS valid + ${implemented.size} invalid fixtures + CLI fail-closed + determinism + direct API + documentation error-code parity\n`);
