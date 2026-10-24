'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../../tools/sam/georef/georef_core.js');
const contract = require('./research_contract.js');

function nearly(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message || 'values differ'}: ${actual} vs ${expected}`);
}
function affinePoint(x, y) { return { x, y, lon: 110 + 0.01 * x - 0.002 * y, lat: 33 - 0.003 * x + 0.008 * y }; }
const base = [[0, 0], [100, 0], [200, 0], [0, 100], [100, 100], [200, 100], [0, 200], [100, 200], [200, 200], [50, 50], [150, 50], [50, 150]].map(([x, y]) => affinePoint(x, y));

const affine = core.fitAffine(base);
nearly(affine.lon[0], 110, 1e-9, 'affine longitude intercept');
nearly(affine.lon[1], 0.01, 1e-9, 'affine longitude x');
nearly(affine.lat[2], 0.008, 1e-9, 'affine latitude y');
nearly(core.rms(core.residuals(affine, base)), 0, 1e-5, 'affine RMS');

function polyPoint(x, y) { return { x, y, lon: 110 + 0.01 * x - 0.002 * y + 0.00001 * x * x + 0.00002 * x * y - 0.00001 * y * y, lat: 33 - 0.003 * x + 0.008 * y - 0.00002 * x * x + 0.00001 * x * y + 0.00003 * y * y }; }
const polynomialPairs = [[0, 0], [100, 0], [0, 100], [120, 40], [40, 170], [210, 130], [300, 220], [80, 280]].map(([x, y]) => polyPoint(x, y));
const poly = core.fitPoly2(polynomialPairs);
nearly(poly.lon[4], 0.00002, 1e-9, 'poly longitude xy');
nearly(poly.lat[5], 0.00003, 1e-9, 'poly latitude y2');
nearly(core.rms(core.residuals(poly, polynomialPairs)), 0, 1e-5, 'poly RMS');

const noisy = base.map((point) => ({ ...point }));
noisy[4].lat += 500 / 111195;
const loo = core.looResiduals('affine', noisy);
const max = loo.reduce((winner, item) => item.meters > winner.meters ? item : winner);
assert.equal(max.x, noisy[4].x, 'the 500 m offset point must have largest LOO residual');
assert.equal(max.y, noisy[4].y, 'the 500 m offset point must have largest LOO residual');
const rest = loo.filter((item) => item !== max).map((item) => item.meters);
assert.ok(max.meters > 5 * Math.max(...rest), 'outlier LOO residual must exceed every other residual by 5x');

assert.throws(() => core.fitAffine(base.slice(0, 2)), /at least 3/);
assert.throws(() => core.fitPoly2(polynomialPairs.slice(0, 5)), /at least 6/);
assert.throws(() => core.fitAffine([affinePoint(0, 0), affinePoint(1, 1), affinePoint(2, 2)]), /degenerate/);

const state = {
  imageLabel: 'synthetic', imageSha256: 'abc', imageWidth: 1200, imageHeight: 800, gcpSetId: 'synthetic-gcps',
  gcpImageSha256: 'abc', gcpImageWidth: 1200, gcpImageHeight: 800,
  transformKind: 'affine', controlPoints: base, sourceId: 'map-source', datasetId: 'synthetic-dataset',
  features: [{ id: 'front-1', mode: 'line', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], feature_type: 'flood_front', as_written: 'synthetic date', date_from: '1938-06-01', locator: 'synthetic' }],
};
const dataset = core.buildDataset(state);
const sources = [{ source_id: 'map-source', title: 'synthetic map', author_or_org: 'test', edition: null, url: null, source_kind: 'original_map', license_status: 'unknown', accessed: null, synthetic: false }];
assert.deepEqual(contract.validateDataset({ dataset, sources, legacyInventory: { entries: [] } }).errors, [], 'generated dataset must validate without errors');
const invalid = core.buildDataset({ ...state, features: [{ ...state.features[0], date_to: '1938-06-01' }] });
assert.ok(contract.validateDataset({ dataset: invalid, sources, legacyInventory: { entries: [] } }).errors.some((item) => item.code === 'E_OBSERVED'), 'equal date endpoints must be rejected as E_OBSERVED');

assert.equal(core.imageBinding(state).ok, true, 'matching image and GCP bindings must be accepted');
assert.equal(core.imageBinding({ ...state, gcpImageSha256: 'different' }).ok, false, 'different image and GCP SHA values must be rejected');
assert.equal(core.imageBinding({ ...state, gcpImageSha256: null }).ok, false, 'a missing image or GCP SHA value must be rejected');
assert.throws(() => core.buildGcpSet({ ...state, gcpImageWidth: 1199 }), /宽高/);

const disabledGcp = core.buildGcpSet({ ...state, controlPoints: base.map((point, index) => ({ ...point, id: `gcp-${index}`, name: `Control ${index}`, disabled: index === base.length - 1 })) });
assert.equal(disabledGcp.loo_residuals_meters.length, disabledGcp.control_points.length, 'LOO array must align with every control point');
assert.equal(disabledGcp.loo_residuals_meters.at(-1), null, 'disabled control point LOO slot must be null');
assert.ok(Number.isFinite(disabledGcp.loo_residuals_meters[0]), 'enabled control point LOO slot must retain its residual');
assert.equal(disabledGcp.control_points[0].loo_residual_meters, disabledGcp.loo_residuals_meters[0], 'per-point and aligned LOO values must agree');
assert.equal(core.looResiduals('affine', disabledGcp.control_points)[0].name, 'Control 0', 'LOO entries must retain the name used by the UI maximum indicator');

const exactlyAffine = { ...state, controlPoints: base.slice(0, 3) };
assert.equal(core.exportReadiness(exactlyAffine, 'geojson').code, 'E_REDUNDANCY', 'three affine points must not export GeoJSON without redundancy');
assert.throws(() => core.buildDataset(exactlyAffine), /无冗余/);
const exactlyPoly = { ...state, transformKind: 'poly2', controlPoints: polynomialPairs.slice(0, 6) };
assert.equal(core.exportReadiness(exactlyPoly, 'geojson').code, 'E_REDUNDANCY', 'six polynomial points must not export GeoJSON without redundancy');
assert.equal(core.exportReadiness({ ...exactlyPoly, controlPoints: polynomialPairs.slice(0, 7) }, 'geojson').ok, true, 'seven polynomial points provide export redundancy');

const css = fs.readFileSync(require.resolve('../../tools/sam/georef/georef.css'), 'utf8');
assert.match(css, /\[hidden\]\s*\{\s*display:\s*none !important;/, 'the accepted hidden override must remain');
assert.match(css, /@media \(orientation: portrait\) and \(max-width: 1100px\)/, 'portrait iPad bottom-drawer rule must remain');
assert.match(css, /main\.drawer-collapsed #map-pane/, 'collapsed portrait drawer must return the map to full height');
assert.ok([[768, 1024], [820, 1180], [1024, 1366]].every(([width, height]) => width <= 1100 && height > width), 'the three required portrait viewports must match the CSS media predicate');

const kaifeng = { lat: 34.80, lon: 114.31 }; const zhengzhou = { lat: 34.75, lon: 113.63 };
nearly(core.haversineM(kaifeng, zhengzhou) / 1000, 62, 1, 'Kaifeng to Zhengzhou distance');

console.log('georef_core.test.js: 11 required assertions groups passed');
