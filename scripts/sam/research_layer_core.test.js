'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../../js/sam/research_layer_core.js');
const LegacyFingerprint = require('../../js/sam/legacy_fingerprint.js');
const Contract = require('./research_contract.js');

const root = path.resolve(__dirname, '..', '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/sam/audit/hydro_inventory.json'), 'utf8'));
const demo = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/research_demo/demo_synthetic.geojson'), 'utf8'));
const sources = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/research_demo/demo_sources.json'), 'utf8'));

function loadHydro() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/china_geo_data.js'), 'utf8'), sandbox, { filename: 'china_geo_data.js' });
  return sandbox.window.HYDRO_DATA;
}

function feature(id, geometry, supersedes = []) {
  return { id, geometry, properties: { valid: { from: 1900, to: 2000, from_status: 'known', to_status: 'known' }, review_state: 'proposed', supersedes } };
}

function node(name) {
  return {
    name, attributes: {}, children: [], style: {}, parentNode: null,
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    append(...children) { children.forEach((child) => typeof child === 'string' ? this.children.push(child) : this.appendChild(child)); },
    replaceChildren(...children) { this.children = []; children.forEach((child) => this.appendChild(child)); },
    setAttribute(key, value) { this.attributes[key] = String(value); },
    addEventListener() {},
  };
}

function makeGlueHarness({ dataset = demo, failInsert = false, deferredFetch = false } = {}) {
  const errors = [];
  const document = { head: node('head'), body: node('body'), createElement: (name) => node(name), createElementNS: (_namespace, name) => node(name) };
  const svg = node('svg');
  svg.querySelector = (selector) => svg.children.find((child) => selector === '#grp-sam-research' && child.id === 'grp-sam-research') || null;
  const riverParent = node('river-parent');
  riverParent.insertBefore = (child) => {
    if (failInsert) throw new Error('insert failed after legacy draw');
    child.parentNode = riverParent; svg.appendChild(child); return child;
  };
  const rivers = node('rivers');
  rivers.ownerSVGElement = svg; rivers.parentNode = riverParent; rivers.nextSibling = null;
  function Controller() {}
  Controller.prototype._hydroMask = function originalHydroMask() { return 'legacy-mask'; };
  Controller.prototype._buildTerrainRivers = function originalBuildTerrainRivers() {
    this.renderedLegacy = this.hydroData.rivers.map((item) => item.name);
    this.activeHydroMask = this._hydroMask(this.year);
  };
  const app = Object.assign(Object.create(Controller.prototype), { year: 1938, hydroData: loadHydro(), grpRivers: rivers, projector: { toScreen: (x, y) => [x, y] } });
  const responses = [dataset, sources, inventory];
  let release;
  const gate = deferredFetch ? new Promise((resolve) => { release = resolve; }) : Promise.resolve();
  let responseIndex = 0;
  const window = {
    location: { search: '?research=demo.geojson&research_sources=sources.json', href: 'https://example.test/atlas/' },
    HistoricalAtlasController: Controller, atlasApp: app, HYDRO_DATA: app.hydroData,
    SamResearchLayerCore: Core, SamResearchContract: Contract,
    addEventListener() {},
  };
  const context = { window, document, URL, URLSearchParams, Map, Set, Symbol, Promise, console: { error: (...args) => errors.push(args.map((value) => typeof value === 'object' ? JSON.stringify(value) : value).join(' ')) }, fetch: () => gate.then(() => ({ ok: true, url: 'https://example.test/data', json: async () => responses[responseIndex++] })) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/sam/research_layer.js'), 'utf8'), context, { filename: 'research_layer.js' });
  return { app, Controller, document, errors, release, svg };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function main() {
  assert.deepEqual(Core.parseResearchParams(''), { enabled: false, error: null });
  assert.match(Core.parseResearchParams('?research=a.geojson').error, /together/);
  for (const bad of ['https://x.geojson', 'HTTP://evil.example/demo.geojson', '\\\\evil.example/demo.geojson', 'data:application/json,{}', '/abs.geojson', 'a/../b.geojson', 'a//b.geojson', 'a%2fb.geojson', 'a.txt']) assert.ok(Core.parseResearchParams(`?research=${encodeURIComponent(bad)}&research_sources=s.json`).error, bad);
  assert.deepEqual(Core.parseResearchParams('?research=a/b.geojson&research_sources=c/d.json'), { enabled: true, dataPath: 'a/b.geojson', sourcesPath: 'c/d.json', error: null });

  const timed = demo.features[0];
  assert.equal(Core.isFeatureVisible(timed, 1937), false);
  assert.equal(Core.isFeatureVisible(timed, 1938), true);
  assert.equal(Core.isFeatureVisible(timed, 1946), true);
  assert.equal(Core.isFeatureVisible(timed, 1947), false);
  const open = structuredClone(timed); open.properties.valid.to = null; open.properties.valid.to_status = 'open';
  assert.equal(Core.isFeatureVisible(open, 3000), true);
  assert.equal(Core.isFeatureVisible(demo.features[1], 1940), false);
  assert.equal(Core.isFeatureVisible(demo.features[3], 1940), false, 'R2-09 to_status unknown must be hidden');

  assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1937), true), []);
  assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1938), true), ['river:Huang:84327c8013cf']);
  assert.deepEqual(Core.computeSuppressed(Core.computeVisible(demo, 1938), false), []);
  const nullGeometrySupersedes = structuredClone(demo);
  nullGeometrySupersedes.features[0].properties.review_state = 'rejected';
  nullGeometrySupersedes.features[2].properties.supersedes = ['river:Huang:84327c8013cf'];
  assert.deepEqual(Core.computeSuppressed(Core.computeVisible(nullGeometrySupersedes, 2000), true), [], 'R2-01 null geometry cannot suppress legacy');
  const noDrawable = makeGlueHarness({ dataset: nullGeometrySupersedes });
  await flush();
  const noDrawablePanel = noDrawable.document.body.children.find((child) => child.id === 'sam-research-layer-status');
  assert.match(noDrawablePanel.children[0].textContent, /可绘制要素 0；无几何要素 1；压制旧条目 0/);
  assert.match(noDrawablePanel.children[0].textContent, /本年无研究数据/, 'R2-01 panel must distinguish no drawable research data');

  const hydro = loadHydro();
  assert.equal((await Core.checkLegacyDrift(inventory, hydro, inventory.entries.map((entry) => entry.legacy_id))).length, 0, 'R2-04 all 290 current entries must match inventory fingerprints');
  for (const entry of inventory.entries) {
    const collection = hydro[entry.kind === 'river' ? 'rivers' : entry.kind === 'lake' ? 'lakes' : 'labels'];
    assert.equal(LegacyFingerprint.fingerprintNode(entry.kind, collection[entry.index]), entry.fp, entry.legacy_id);
  }
  const browserFingerprintSandbox = { crypto: crypto.webcrypto, TextEncoder };
  vm.createContext(browserFingerprintSandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/sam/legacy_fingerprint.js'), 'utf8'), browserFingerprintSandbox, { filename: 'legacy_fingerprint.js' });
  assert.equal(await browserFingerprintSandbox.SamLegacyFingerprint.fingerprintBrowser('river', hydro.rivers[168]), inventory.entries[168].fp, 'browser Web Crypto fingerprint must equal the inventory fp');
  const changed = structuredClone(hydro); changed.rivers[168].lines[0][0][0] = 115.09;
  const drift = await Core.checkLegacyDrift(inventory, changed, timed.properties.supersedes);
  assert.equal(drift.length, 1); assert.equal(drift[0].legacy_id, 'river:Huang:84327c8013cf', 'R2-04 coordinate-only drift must fail');

  const initialMask = Core.researchMask(demo, 1938, true);
  const revised = structuredClone(demo); revised.meta.dataset_revision = 'demo-r2';
  assert.notEqual(Core.researchMask(revised, 1938, true), initialMask);
  assert.notEqual(Core.researchMask(demo, 1937, true), initialMask);
  const delimiterOne = { meta: { dataset_revision: 'mask-test' }, features: [feature('a,b', { type: 'LineString', coordinates: [[0, 0], [1, 0]] })] };
  const delimiterTwo = { meta: { dataset_revision: 'mask-test' }, features: [feature('a', { type: 'LineString', coordinates: [[0, 0], [1, 0]] }), feature('b', { type: 'LineString', coordinates: [[2, 0], [3, 0]] })] };
  assert.notEqual(Core.researchMask(delimiterOne, 1938, true), Core.researchMask(delimiterTwo, 1938, true), 'R2-02 delimiter collision must not share a mask');

  const identity = (x, y) => [x, y];
  assert.equal(Core.featurePathData({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }, identity), 'M0 0L1 1');
  const hole = { type: 'Polygon', coordinates: [[[100, 20], [104, 20], [104, 24], [100, 24], [100, 20]], [[101, 21], [103, 21], [103, 23], [101, 23], [101, 21]]] };
  assert.equal(Core.featurePathData(hole, identity), 'M100 20L104 20L104 24L100 24L100 20ZM101 21L103 21L103 23L101 23L101 21Z');
  const polygonDemo = structuredClone(demo); polygonDemo.features[0].geometry = hole;
  const filled = makeGlueHarness({ dataset: polygonDemo });
  await flush();
  const polygonGroup = filled.svg.querySelector('#grp-sam-research');
  assert.ok(polygonGroup, filled.errors.join('\n'));
  assert.equal(polygonGroup.children[0].attributes['fill-rule'], 'evenodd', 'R2-05 Polygon must use evenodd fill');

  const failedDom = makeGlueHarness({ failInsert: true });
  await flush();
  assert.equal(failedDom.app.renderedLegacy.length, failedDom.app.hydroData.rivers.length, 'R2-06 DOM failure must redraw unfiltered legacy rivers');
  assert.ok(failedDom.errors.some((message) => message.includes('研究图层渲染失败')), 'R2-06 must report a rendering error');

  const overwritten = makeGlueHarness({ deferredFetch: true });
  overwritten.Controller.prototype._hydroMask = function laterMask() { return 'later'; };
  overwritten.release();
  await flush();
  assert.equal(overwritten.app.renderedLegacy, undefined, 'R2-07 replaced wrapper must prevent research rendering');
  assert.ok(overwritten.errors.some((message) => message.includes('与当前上游版本不兼容')), 'R2-07 must report replaced wrappers');

  process.stdout.write('PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA\n');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
