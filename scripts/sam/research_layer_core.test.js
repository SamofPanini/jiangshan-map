'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../../js/sam/research_layer_core.js');

const root = path.resolve(__dirname, '..', '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/sam/audit/hydro_inventory.json'), 'utf8'));
const demo = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/research_demo/demo_synthetic.geojson'), 'utf8'));

assert.deepEqual(Core.parseResearchParams(''), { enabled: false, error: null });
assert.match(Core.parseResearchParams('?research=a.geojson').error, /together/);
for (const bad of ['https://x', '/abs', 'a/../b', '//x']) assert.ok(Core.parseResearchParams(`?research=${encodeURIComponent(bad)}&research_sources=s.json`).error, bad);
assert.deepEqual(Core.parseResearchParams('?research=a/b.geojson&research_sources=c/d.json'), { enabled: true, dataPath: 'a/b.geojson', sourcesPath: 'c/d.json', error: null });

const timed = demo.features[0];
assert.equal(Core.isFeatureVisible(timed, 1937), false);
assert.equal(Core.isFeatureVisible(timed, 1938), true);
assert.equal(Core.isFeatureVisible(timed, 1946), true);
assert.equal(Core.isFeatureVisible(timed, 1947), false);
const open = structuredClone(timed); open.properties.valid.to = null; open.properties.valid.to_status = 'open';
assert.equal(Core.isFeatureVisible(open, 3000), true);
assert.equal(Core.isFeatureVisible(demo.features[1], 1940), false);

assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1937), true), []);
assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1938), true), ['river:Huang:84327c8013cf']);
assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1938), false), []);

const hydroSandbox = { window: {} };
vm.createContext(hydroSandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/china_geo_data.js'), 'utf8'), hydroSandbox, { filename: 'china_geo_data.js' });
const ids = timed.properties.supersedes;
assert.deepEqual(Core.checkLegacyDrift(inventory, hydroSandbox.window.HYDRO_DATA, ids), []);
const changed = structuredClone(hydroSandbox.window.HYDRO_DATA); changed.rivers[168].vanish = 2000;
const drift = Core.checkLegacyDrift(inventory, changed, ids);
assert.equal(drift.length, 1); assert.equal(drift[0].legacy_id, 'river:Huang:84327c8013cf');

const initialMask = Core.researchMask(demo, 1938, true);
const revised = structuredClone(demo); revised.meta.dataset_revision = 'demo-r2';
assert.notEqual(Core.researchMask(revised, 1938, true), initialMask);
assert.notEqual(Core.researchMask(demo, 1937, true), initialMask);
assert.equal(Core.researchMask(demo, 1938, true), Core.researchMask(demo, 1946, true));

const identity = (x, y) => [x, y];
assert.equal(Core.featurePathData({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }, identity), 'M0 0L1 1');
assert.equal(Core.featurePathData({ type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 0]], [[.5, .5], [1, .5], [.5, .5]]] }, identity), 'M0 0L2 0L2 2L0 0ZM0.5 0.5L1 0.5L0.5 0.5Z');

process.stdout.write('PASS research-layer core: params + intervals + suppression + drift + masks + geometry paths + real HYDRO_DATA\n');
