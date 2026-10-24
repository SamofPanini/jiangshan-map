'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const contract = require('./research_contract.js');
const { validateDataset } = contract;

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
function resultCodes(dataset, sourceList = JSON.parse(fs.readFileSync(sources, 'utf8'))) {
  return new Set(validateDataset({ dataset, sources: sourceList, legacyInventory: memoryLegacy }).errors.map((error) => error.code));
}
function v02Dataset() {
  const dataset = JSON.parse(fs.readFileSync(data, 'utf8'));
  dataset.meta.schema_version = '0.2.0';
  for (const feature of dataset.features) {
    feature.properties.observed = null;
    feature.properties.derivation = feature.geometry === null ? null : { method: 'place_anchor', gcp_set_id: null, note: null };
  }
  return dataset;
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
const memorySources = JSON.parse(fs.readFileSync(sources, 'utf8'));
const memoryLegacy = JSON.parse(fs.readFileSync(legacy, 'utf8'));
const nodeValid = validateDataset({ dataset: memoryDataset, sources: memorySources, legacyInventory: memoryLegacy });
assert.throws(() => validateDataset({ dataset: memoryDataset, sources: memorySources, legacyInventory: { bad: true } }), TypeError, 'direct API must reject malformed legacy inventory');
memoryDataset.features[0].geometry.coordinates[0] = [200, 35];
const direct = validateDataset({ dataset: memoryDataset, sources: memorySources, legacyInventory: memoryLegacy });
assert.deepEqual(new Set(direct.errors.map((error) => error.code)), new Set(['E_COORD']));

const v01Observed = JSON.parse(fs.readFileSync(data, 'utf8'));
v01Observed.features[0].properties.observed = null;
assert.deepEqual(resultCodes(v01Observed), new Set(['E_UNKNOWN_KEY']), 'v0.1 observed must stay an unknown key');
const v01Point = JSON.parse(fs.readFileSync(data, 'utf8'));
v01Point.features[0].geometry = { type: 'Point', coordinates: [114, 35] };
assert.deepEqual(resultCodes(v01Point), new Set(['E_GEOM_TYPE']), 'v0.1 Point must stay unsupported');
const v01Front = JSON.parse(fs.readFileSync(data, 'utf8'));
v01Front.features[0].properties.feature_type = 'flood_front';
assert.deepEqual(resultCodes(v01Front), new Set(['E_ENUM']), 'v0.1 flood_front must stay outside the enum');

const v02MissingObserved = v02Dataset();
delete v02MissingObserved.features[0].properties.observed;
assert.ok(resultCodes(v02MissingObserved).has('E_REQUIRED'), 'v0.2 observed key is required');
const v02MissingDerivation = v02Dataset();
delete v02MissingDerivation.features[0].properties.derivation;
assert.ok(resultCodes(v02MissingDerivation).has('E_REQUIRED'), 'v0.2 derivation key is required');
const v02FrontNullObserved = v02Dataset();
v02FrontNullObserved.features[0].properties.feature_type = 'flood_front';
assert.ok(resultCodes(v02FrontNullObserved).has('E_OBSERVED'), 'flood_front needs observed');

const observedDataset = v02Dataset();
const observedFeature = observedDataset.features[0];
observedFeature.properties.feature_type = 'flood_front';
observedFeature.properties.valid = { from: 1938, to: 1939, interval: 'half_open', from_status: 'known', to_status: 'known' };
observedFeature.properties.observed = { date_from: '1938-06-13', date_to: '1938-06-14', part_of_day: null, as_written: '13日' };
assert.ok(!resultCodes(observedDataset).has('E_OBSERVED'), 'a one-day observed interval must pass');
const invalidCalendar = structuredClone(observedDataset);
invalidCalendar.features[0].properties.observed.date_from = '2026-02-30';
assert.ok(resultCodes(invalidCalendar).has('E_OBSERVED'), 'invalid calendar date must fail');
const emptyObservedInterval = structuredClone(observedDataset);
emptyObservedInterval.features[0].properties.observed.date_to = '1938-06-13';
assert.ok(resultCodes(emptyObservedInterval).has('E_OBSERVED'), 'empty observed interval must fail');
const observedOutsideValid = structuredClone(observedDataset);
observedOutsideValid.features[0].properties.valid = { from: 1939, to: 1940, interval: 'half_open', from_status: 'known', to_status: 'known' };
assert.ok(resultCodes(observedOutsideValid).has('E_OBSERVED'), 'observed year outside valid must fail');

const missingGcp = structuredClone(observedDataset);
missingGcp.features[0].properties.derivation = { method: 'georef_affine', gcp_set_id: null, note: null };
assert.ok(resultCodes(missingGcp).has('E_DERIVATION'), 'georef derivation needs gcp_set_id');
const placeAnchor = structuredClone(observedDataset);
placeAnchor.features[0].properties.derivation = { method: 'place_anchor', gcp_set_id: null, note: null };
assert.ok(!resultCodes(placeAnchor).has('E_DERIVATION'), 'place_anchor permits null gcp_set_id');
const noDerivationDraft = structuredClone(observedDataset);
noDerivationDraft.features[0].properties.derivation = null;
assert.ok(validateDataset({ dataset: noDerivationDraft, sources: memorySources, legacyInventory: memoryLegacy }).warnings.some((warning) => warning.code === 'W_NO_DERIVATION'), 'draft null derivation must warn');
const noDerivationRelease = structuredClone(noDerivationDraft);
noDerivationRelease.meta.stage = 'release';
assert.ok(validateDataset({ dataset: noDerivationRelease, sources: memorySources, legacyInventory: memoryLegacy }).errors.some((error) => error.code === 'E_RELEASE' && error.path === '/features/0/properties/derivation'), 'release null derivation must fail');

const duplicatePoints = structuredClone(observedDataset);
duplicatePoints.features[0].geometry = { type: 'MultiPoint', coordinates: [[114, 35], [114, 35]] };
assert.ok(resultCodes(duplicatePoints).has('E_POINT_DUP'), 'duplicate MultiPoint coordinates must fail');
const outsideRegionPoint = structuredClone(observedDataset);
outsideRegionPoint.features[0].geometry = { type: 'Point', coordinates: [141, 35] };
assert.ok(resultCodes(outsideRegionPoint).has('E_REGION_BBOX'), 'points outside cn bbox must fail');
const nanPoint = structuredClone(observedDataset);
nanPoint.features[0].geometry = { type: 'Point', coordinates: [NaN, 35] };
assert.deepEqual(resultCodes(nanPoint), new Set(['E_COORD']), 'NaN point must report only E_COORD');

const releaseWithNullClaim = JSON.parse(fs.readFileSync(data, 'utf8'));
const releaseSources = JSON.parse(fs.readFileSync(sources, 'utf8'));
releaseWithNullClaim.meta.stage = 'release';
releaseWithNullClaim.meta.synthetic = false;
releaseSources[0].synthetic = false;
for (const feature of releaseWithNullClaim.features) feature.properties.review_state = 'accepted';
releaseWithNullClaim.features[0].properties.claims = [null];
const releaseResult = validateDataset({ dataset: releaseWithNullClaim, sources: releaseSources, legacyInventory: memoryLegacy });
assert.ok(releaseResult.errors.some((error) => error.code === 'E_TYPE' && error.path === '/features/0/properties/claims/0'), 'release null claim must be reported structurally');

const browserSandbox = {};
vm.createContext(browserSandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'research_contract.js'), 'utf8'), browserSandbox, { filename: 'research_contract.js' });
assert.equal(typeof browserSandbox.SamResearchContract.validateDataset, 'function', 'browser export must expose validateDataset');
const browserValid = browserSandbox.SamResearchContract.validateDataset({ dataset: JSON.parse(fs.readFileSync(data, 'utf8')), sources: memorySources, legacyInventory: memoryLegacy });
assert.deepEqual(JSON.parse(JSON.stringify(browserValid)), nodeValid, 'browser and Node validation results must match');

const contractDocument = fs.readFileSync(path.join(root, 'docs', 'sam', 'CONTRACT.md'), 'utf8');
const documented = new Set([...contractDocument.matchAll(/`(E_[A-Z_]+)`/g)].map((match) => match[1]));
const implemented = new Set(['E_TOP_SHAPE', 'E_SCHEMA_VERSION', 'E_REQUIRED', 'E_UNKNOWN_KEY', 'E_TYPE', 'E_ENUM', 'E_REGION', 'E_DUP_ID', 'E_INTERVAL', 'E_NULL_REASON', 'E_GEOM_ABSENT', 'E_GEOM_TYPE', 'E_EMPTY', 'E_COORD', 'E_REGION_BBOX', 'E_LINE', 'E_POINT_DUP', 'E_RING', 'E_SELF_INTERSECT', 'E_SOURCE_REF', 'E_LEGACY_REF', 'E_OBSERVED', 'E_DERIVATION', 'E_RELEASE']);
assert.deepEqual(documented, implemented, 'CONTRACT.md error-code table must match the implementation');

const enumNames = ['STAGES', 'INTERVALS', 'ENDPOINT_STATUSES', 'FEATURE_TYPES', 'EVIDENCE_MODES', 'REVIEW_STATES', 'LICENSE_STATUSES', 'SOURCE_KINDS', 'ABSENT_REASONS', 'SUPPORTS', 'GEOMETRY_TYPES', 'DERIVATION_METHODS'];
for (const name of enumNames) {
  const row = contractDocument.match(new RegExp(`^\\| \`${name}\` \\| (.+) \\|$`, 'm'));
  assert.ok(row, `CONTRACT.md must document ${name}`);
  const documentedValues = new Set([...row[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]));
  assert.deepEqual(documentedValues, new Set(contract[name]), `CONTRACT.md ${name} must match exported enum`);
}

const miniLegacy = JSON.parse(fs.readFileSync(legacy, 'utf8'));
const fullLegacy = JSON.parse(fs.readFileSync(realLegacy, 'utf8'));
assert.deepEqual(miniLegacy.meta.inputs, fullLegacy.meta.inputs, 'mini legacy meta.inputs must match the real inventory');
for (const entry of miniLegacy.entries) assert.deepEqual(fullLegacy.entries.find((candidate) => candidate.legacy_id === entry.legacy_id), entry, `mini legacy entry ${entry.legacy_id} must match the real inventory`);

process.stdout.write(`PASS valid + ${implemented.size} error codes + v0.1 compatibility + v0.2 observed/derivation/point validation + CLI fail-closed + determinism + direct API + browser export + documentation parity\n`);
