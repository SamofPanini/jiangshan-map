#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REQUIRED_OPTIONS = new Set(['--geo', '--map', '--out-dir', '--margin-deg']);

function failUsage(message) {
  const error = new Error(message);
  error.exitCode = 2;
  throw error;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!REQUIRED_OPTIONS.has(key)) failUsage(`unknown parameter: ${key}`);
    if (Object.prototype.hasOwnProperty.call(options, key)) failUsage(`duplicate parameter: ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) failUsage(`missing value for ${key}`);
    options[key] = value;
    i += 1;
  }
  for (const key of REQUIRED_OPTIONS) {
    if (!Object.prototype.hasOwnProperty.call(options, key)) failUsage(`missing required parameter: ${key}`);
  }
  const marginDeg = Number(options['--margin-deg']);
  if (!Number.isFinite(marginDeg) || marginDeg < 0) failUsage('--margin-deg must be a finite number greater than or equal to 0');
  return {
    geoPath: options['--geo'],
    mapPath: options['--map'],
    outDir: options['--out-dir'],
    marginDeg,
  };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function loadWindowValue(filePath, valueName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { value: sandbox.window[valueName], sha256: sha256(code) };
}

function assertArray(value, description) {
  if (!Array.isArray(value)) throw new Error(`${description} must be an array`);
}

function validateHydro(hydro) {
  if (!hydro || typeof hydro !== 'object') throw new Error('window.HYDRO_DATA is missing or not an object');
  for (const key of ['rivers', 'lakes', 'labels']) assertArray(hydro[key], `HYDRO_DATA.${key}`);
}

function validateCorridors(corridors) {
  assertArray(corridors, 'window.CORRIDOR_DATA');
}

function nullable(value) {
  return value === undefined ? null : value;
}

function isTimed(item) {
  return item.appear !== undefined || item.vanish !== undefined;
}

function isHydroVisible(item, year) {
  return (item.appear === undefined || year >= item.appear) && (item.vanish === undefined || year < item.vanish);
}

function isCorridorVisible(corridor, year) {
  return !corridor.span || (year >= corridor.span[0] && year <= corridor.span[1]);
}

function isPoint(point) {
  return Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]);
}

function bboxFromParts(parts, description) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let pointCount = 0;
  for (const part of parts) {
    assertArray(part, `${description} part`);
    for (const point of part) {
      if (!isPoint(point)) throw new Error(`${description} contains an invalid coordinate`);
      minLon = Math.min(minLon, point[0]);
      minLat = Math.min(minLat, point[1]);
      maxLon = Math.max(maxLon, point[0]);
      maxLat = Math.max(maxLat, point[1]);
      pointCount += 1;
    }
  }
  if (pointCount === 0) throw new Error(`${description} contains no coordinates`);
  return { part_count: parts.length, point_count: pointCount, bbox: [minLon, minLat, maxLon, maxLat] };
}

function labelName(item) {
  if (!item || typeof item.zh !== 'string') throw new Error('label must have a string zh field');
  return item.zh;
}

function fingerprint(kind, item, coordinates) {
  const name = kind === 'label' ? labelName(item) : item.name;
  if (typeof name !== 'string') throw new Error(`${kind} must have a string name field`);
  const canonical = {
    kind,
    name,
    rank: nullable(item.rank),
    appear: nullable(item.appear),
    vanish: nullable(item.vanish),
    coordinates,
  };
  return sha256(JSON.stringify(canonical)).slice(0, 12);
}

function makeHydroEntry(kind, item, index) {
  const name = kind === 'label' ? labelName(item) : item.name;
  let geometry;
  let coordinates;
  if (kind === 'label') {
    if (!isPoint(item.coord)) throw new Error('label contains an invalid coord');
    coordinates = item.coord;
    geometry = { coord: item.coord };
  } else {
    const partKey = kind === 'river' ? 'lines' : 'rings';
    assertArray(item[partKey], `${kind}.${partKey}`);
    coordinates = item[partKey];
    const stats = bboxFromParts(coordinates, `${kind} ${name}`);
    geometry = {
      [`${kind === 'river' ? 'line' : 'ring'}_count`]: stats.part_count,
      point_count: stats.point_count,
      bbox: stats.bbox,
    };
  }
  const fp = fingerprint(kind, item, coordinates);
  return {
    kind,
    index,
    name: kind === 'label' ? { zh: item.zh, en: nullable(item.en) } : name,
    rank: nullable(item.rank),
    appear: nullable(item.appear),
    vanish: nullable(item.vanish),
    timed: isTimed(item),
    ...geometry,
    fp,
    legacy_id: `${kind}:${name}:${fp}`,
    _bbox: geometry.bbox || null,
    _source: item,
  };
}

function publicHydroEntry(entry) {
  const { _bbox, _source, ...publicEntry } = entry;
  return publicEntry;
}

function buildHydroEntries(hydro) {
  const entries = [];
  for (const [kind, sourceKey] of [['river', 'rivers'], ['lake', 'lakes'], ['label', 'labels']]) {
    hydro[sourceKey].forEach((item, index) => entries.push(makeHydroEntry(kind, item, index)));
  }
  const ids = new Map();
  for (const entry of entries) {
    const duplicates = ids.get(entry.legacy_id) || [];
    duplicates.push(entry);
    ids.set(entry.legacy_id, duplicates);
  }
  const collisions = [...ids.values()].filter((group) => group.length > 1);
  if (collisions.length) {
    const rendered = collisions.map((group) => group.map((entry) => entry.legacy_id));
    throw new Error(`legacy_id collision(s): ${JSON.stringify(rendered)}`);
  }
  return entries;
}

function buildStaticSummary(entries) {
  const counts = new Map();
  for (const entry of entries.filter((entry) => !entry.timed)) {
    const key = `${entry.kind}\u0000${entry.rank}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [kind, rank] = key.split('\u0000');
    return { kind, rank: rank === 'null' ? null : Number(rank), count };
  }).sort((a, b) => a.kind.localeCompare(b.kind) || String(a.rank).localeCompare(String(b.rank)));
}

function buildCorridorEntry(item, index) {
  if (!item || typeof item !== 'object') throw new Error(`corridor ${index} is not an object`);
  if (typeof item.key !== 'string' || typeof item.kind !== 'string') throw new Error(`corridor ${index} lacks key or kind`);
  if (!Array.isArray(item.span) || item.span.length !== 2 || !item.span.every(Number.isFinite)) throw new Error(`corridor ${item.key} has invalid span`);
  assertArray(item.segments, `corridor ${item.key}.segments`);
  const stats = bboxFromParts(item.segments, `corridor ${item.key}`);
  const canonical = {
    kind: item.kind,
    key: item.key,
    title: nullable(item.title),
    span: item.span,
    coordinates: item.segments,
  };
  const fp = sha256(JSON.stringify(canonical)).slice(0, 12);
  return {
    key: item.key,
    kind: item.kind,
    title: nullable(item.title),
    span: item.span,
    span_semantics: 'closed',
    open_end: item.span[1] === 9999,
    segment_count: stats.part_count,
    point_count: stats.point_count,
    bbox: stats.bbox,
    fp,
    fields: Object.keys(item).sort(),
    _source: item,
  };
}

function publicCorridorEntry(entry) {
  const { _source, ...publicEntry } = entry;
  return publicEntry;
}

function bboxesIntersect(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function expandedBbox(bbox, margin) {
  return [bbox[0] - margin, bbox[1] - margin, bbox[2] + margin, bbox[3] + margin];
}

const TOKEN_STOP_WORDS = new Set(['r', 'l', 'river', 'lake', 'marsh', 'course', 'n', 's', 'e', 'w']);
// Only English-name to pinyin-name pairs that can be verified verbatim in this data.
// Additions require a task sheet.
const FIXED_TRANSLITERATIONS = { yellow: 'huang' };

function outsideParentheses(text) {
  return String(text || '').replace(/\([^)]*\)|（[^）]*）/g, '');
}

function tokens(text) {
  return new Set((String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter((token) => token.length > 1 && !TOKEN_STOP_WORDS.has(token)));
}

function sharedTokens(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  return [...leftTokens].filter((token) => rightTokens.has(token)).sort();
}

function translationMatches(labelText, geometryName) {
  const labelTokens = tokens(outsideParentheses(labelText));
  const geometryTokens = tokens(geometryName);
  return Object.entries(FIXED_TRANSLITERATIONS)
    .filter(([english, pinyin]) => labelTokens.has(english) && geometryTokens.has(pinyin))
    .map(([english, pinyin]) => ({ english, pinyin }));
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const projection = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointToPartsDistance(point, parts, closeRings) {
  let distance = Infinity;
  for (const part of parts) {
    if (part.length === 0) continue;
    if (closeRings && pointInRing(point, part)) return 0;
    if (part.length === 1) {
      distance = Math.min(distance, Math.hypot(point[0] - part[0][0], point[1] - part[0][1]));
      continue;
    }
    for (let i = 1; i < part.length; i += 1) distance = Math.min(distance, pointToSegmentDistance(point, part[i - 1], part[i]));
    if (closeRings) distance = Math.min(distance, pointToSegmentDistance(point, part[part.length - 1], part[0]));
  }
  return distance;
}

function geometryDistance(labelCoord, geometry) {
  return geometry.kind === 'river'
    ? pointToPartsDistance(labelCoord, geometry._source.lines, false)
    : pointToPartsDistance(labelCoord, geometry._source.rings, true);
}

function buildBoundaries(hydroEntries, corridors) {
  const byYear = new Map();
  const add = (year, source) => {
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(source);
  };
  for (const entry of hydroEntries) {
    if (entry.appear !== null) add(entry.appear, { legacy_id: entry.legacy_id, endpoint: 'appear', interval: 'half-open' });
    if (entry.vanish !== null) add(entry.vanish, { legacy_id: entry.legacy_id, endpoint: 'vanish', interval: 'half-open' });
  }
  for (const corridor of corridors) {
    add(corridor.span[0], { key: corridor.key, endpoint: 'span_start', interval: 'closed' });
    add(corridor.span[1], { key: corridor.key, endpoint: 'span_end', interval: 'closed' });
  }
  return [...byYear.entries()].map(([year, sources]) => ({
    year: Number(year),
    is_sentinel: Number(year) === 9999,
    meaning: Number(year) === 9999 ? 'open_end' : null,
    sources: sources.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  })).sort((a, b) => a.year - b.year);
}

function buildCorridorHydroMatches(hydroEntries, corridors, marginDeg) {
  const geometryEntries = hydroEntries.filter((entry) => entry.kind !== 'label');
  return corridors.map((corridor) => {
    const corridorBbox = expandedBbox(corridor.bbox, marginDeg);
    const matches = [];
    for (const hydro of geometryEntries) {
      if (!hydro.timed || !bboxesIntersect(corridorBbox, hydro._bbox)) continue;
      for (const endpoint of ['appear', 'vanish']) {
        const year = hydro[endpoint];
        if (year === null || !isCorridorVisible(corridor._source, year)) continue;
        matches.push({
          corridor_key: corridor.key,
          hydro_legacy_id: hydro.legacy_id,
          hydro_endpoint: endpoint,
          year,
          hydro_visible_at_endpoint: isHydroVisible(hydro._source, year),
          rules: { hydro: '[appear, vanish)', corridor: '[span[0], span[1]]' },
        });
      }
    }
    matches.sort((a, b) => a.year - b.year || a.hydro_legacy_id.localeCompare(b.hydro_legacy_id) || a.hydro_endpoint.localeCompare(b.hydro_endpoint));
    return { corridor_key: corridor.key, matches };
  });
}

function buildLabelPairing(hydroEntries, marginDeg) {
  const geometries = hydroEntries.filter((entry) => entry.kind !== 'label');
  const timedLabels = hydroEntries.filter((entry) => entry.kind === 'label' && entry.timed);
  const pairings = [];
  const unpaired = [];
  for (const label of timedLabels) {
    const candidates = [];
    for (const geometry of geometries) {
      const commonTokens = sharedTokens(outsideParentheses(label.name.en), geometry.name);
      const translations = translationMatches(label.name.en, geometry.name);
      const distance = geometryDistance(label.coord, geometry);
      const withinMargin = distance <= marginDeg;
      const intervalExactMatch = label.appear === geometry.appear && label.vanish === geometry.vanish;
      if (commonTokens.length === 0 && translations.length === 0 && !withinMargin) continue;
      const pairing_basis = [];
      if (commonTokens.length) pairing_basis.push({ rule: 'A', shared_tokens: commonTokens });
      if (translations.length) pairing_basis.push({ rule: 'A2', translations });
      if (withinMargin) pairing_basis.push({ rule: 'B', distance_deg: distance.toFixed(4) });
      if (intervalExactMatch && withinMargin) pairing_basis.push({ rule: 'C', interval_exact_match: true });
      candidates.push({
        legacy_id: geometry.legacy_id,
        kind: geometry.kind,
        interval: { appear: geometry.appear, vanish: geometry.vanish },
        interval_exact_match: intervalExactMatch,
        distance_deg: distance.toFixed(4),
        pairing_basis,
      });
    }
    candidates.sort((a, b) => a.legacy_id.localeCompare(b.legacy_id));
    pairings.push({
      label_legacy_id: label.legacy_id,
      label: { zh: label.name.zh, en: label.name.en, interval: { appear: label.appear, vanish: label.vanish } },
      candidates,
    });
    if (candidates.length === 0) unpaired.push(label.legacy_id);
  }
  return { pairings, unpaired };
}

function buildHuangVisibility(boundaries, hydroEntries) {
  const years = [...new Set(boundaries.flatMap((boundary) => [boundary.year - 1, boundary.year]))].sort((a, b) => a - b);
  const huang = hydroEntries.filter((entry) => entry.kind === 'river' && entry.name === 'Huang');
  return years.map((year) => ({
    year,
    visible_legacy_ids: huang.filter((entry) => isHydroVisible(entry._source, year)).map((entry) => entry.legacy_id).sort(),
  }));
}

function buildMeta(options, geo, map, hydro, corridors) {
  return {
    generated_by: 'scripts/sam/hydro_inventory.js',
    generator: { path: 'scripts/sam/hydro_inventory.js', sha256: sha256(fs.readFileSync(__filename, 'utf8')) },
    inputs: {
      geo: { path: options.geoPath, sha256: geo.sha256 },
      map: { path: options.mapPath, sha256: map.sha256 },
    },
    counts: { rivers: hydro.rivers.length, lakes: hydro.lakes.length, labels: hydro.labels.length, corridors: corridors.length },
  };
}

function renderInventoryMarkdown(hydroEntries, staticSummary, corridors, coherence) {
  const timed = hydroEntries.filter((entry) => entry.timed);
  const formatInterval = (entry) => `[${entry.appear === null ? '-∞' : entry.appear}, ${entry.vanish === null ? '∞' : entry.vanish})`;
  const stats = (entry) => entry.kind === 'label' ? `coord ${entry.coord.join(', ')}` : `${entry.line_count === undefined ? entry.ring_count : entry.line_count} parts; ${entry.point_count} points; ${entry.bbox.join(', ')}`;
  const title = (entry) => entry.kind === 'label' ? `${entry.name.zh} / ${entry.name.en || ''}` : entry.name;
  const lines = [
    '# P0a-1 Hydro and Corridor Inventory',
    '',
    'Generated deterministically by `scripts/sam/hydro_inventory.js` from the supplied upstream data bundles.',
    '',
    '## Timed hydro entries',
    '',
    '| legacy_id | name | rank | interval | geometry |',
    '|---|---|---:|---|---|',
    ...timed.map((entry) => `| ${entry.legacy_id} | ${title(entry).replace(/\|/g, '\\|')} | ${entry.rank === null ? '' : entry.rank} | ${formatInterval(entry)} | ${stats(entry)} |`),
    '',
    '## Static entries by kind and rank',
    '',
    '| kind | rank | count |',
    '|---|---:|---:|',
    ...staticSummary.map((row) => `| ${row.kind} | ${row.rank} | ${row.count} |`),
    '',
    '## Corridors',
    '',
    '| key | kind | title | span | segments | points | bbox |',
    '|---|---|---|---|---:|---:|---|',
    ...corridors.map((entry) => `| ${entry.key} | ${entry.kind} | ${String(entry.title || '').replace(/\|/g, '\\|')} | [${entry.span.join(', ')}] | ${entry.segment_count} | ${entry.point_count} | ${entry.bbox.join(', ')} |`),
    '',
    '## Coherence probe counts and samples',
    '',
    `- Boundary years: ${coherence.boundary_years.length}`,
    `- Corridor-to-hydro boundary matches: ${coherence.corridor_hydro_boundary_combinations.reduce((sum, row) => sum + row.matches.length, 0)}`,
    `- Timed label pairing records: ${coherence.timed_label_geometry_pairings.length}; unpaired labels: ${coherence.unpaired_timed_labels.length}`,
    `- Huang visibility probe years: ${coherence.huang_visible_at_boundary_years.length}`,
    '- Timed-label geometry distances use a planar degree approximation (longitude/latitude treated as Cartesian coordinates), not geodesic distance.',
    '',
    '### Boundary-year sample (first 10)',
    '',
    ...coherence.boundary_years.slice(0, 10).map((row) => `- ${row.year}: ${row.sources.map((source) => source.legacy_id || source.key).join(', ')}`),
    '',
    '### Corridor-to-hydro match sample (first 10)',
    '',
    ...coherence.corridor_hydro_boundary_combinations.flatMap((row) => row.matches).slice(0, 10).map((row) => `- ${row.corridor_key} / ${row.hydro_legacy_id} / ${row.hydro_endpoint}=${row.year}`),
    '',
    '### Timed-label pairing sample (first 10)',
    '',
    ...coherence.timed_label_geometry_pairings.slice(0, 10).map((row) => `- ${row.label_legacy_id}: ${row.candidates.map((candidate) => candidate.legacy_id).join(', ') || '(unpaired)'}`),
    '',
    '## Interval semantics',
    '',
    'Hydro visibility is half-open `[appear, vanish)`: an item vanishing in year `y` is not visible in `y`. Corridor visibility is closed `[span[0], span[1]]`: a corridor remains visible at both endpoints.',
    '',
  ];
  return lines.join('\n');
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function run(options) {
  const geo = loadWindowValue(options.geoPath, 'HYDRO_DATA');
  const map = loadWindowValue(options.mapPath, 'CORRIDOR_DATA');
  validateHydro(geo.value);
  validateCorridors(map.value);
  const hydroEntries = buildHydroEntries(geo.value);
  const corridorEntries = map.value.map(buildCorridorEntry);
  const meta = buildMeta(options, geo, map, geo.value, map.value);
  const boundaries = buildBoundaries(hydroEntries, corridorEntries);
  const labelPairing = buildLabelPairing(hydroEntries, options.marginDeg);
  const coherence = {
    meta,
    margin_deg: options.marginDeg,
    boundary_years: boundaries,
    corridor_hydro_boundary_combinations: buildCorridorHydroMatches(hydroEntries, corridorEntries, options.marginDeg),
    timed_label_geometry_pairings: labelPairing.pairings,
    unpaired_timed_labels: labelPairing.unpaired,
    huang_visible_at_boundary_years: buildHuangVisibility(boundaries, hydroEntries),
  };
  const hydroInventory = { meta, entries: hydroEntries.map(publicHydroEntry), static_summary: buildStaticSummary(hydroEntries) };
  const corridorInventory = { meta, entries: corridorEntries.map(publicCorridorEntry) };
  const inventoryMarkdown = renderInventoryMarkdown(hydroEntries, hydroInventory.static_summary, corridorEntries, coherence);
  fs.mkdirSync(options.outDir, { recursive: true });
  writeJson(path.join(options.outDir, 'hydro_inventory.json'), hydroInventory);
  writeJson(path.join(options.outDir, 'corridor_inventory.json'), corridorInventory);
  writeJson(path.join(options.outDir, 'coherence_probe.json'), coherence);
  fs.writeFileSync(path.join(options.outDir, 'P0a-1_INVENTORY.md'), inventoryMarkdown, 'utf8');
  const reportLine = `READ geo=${options.geoPath} sha256=${geo.sha256} map=${options.mapPath} sha256=${map.sha256} rivers=${geo.value.rivers.length} lakes=${geo.value.lakes.length} labels=${geo.value.labels.length} corridors=${map.value.length}`;
  return { reportLine, hydroInventory, corridorInventory, coherence };
}

function main() {
  try {
    const result = run(parseArgs(process.argv.slice(2)));
    console.log(result.reportLine);
  } catch (error) {
    console.error(`hydro_inventory: ${error.message}`);
    process.exitCode = error.exitCode || 1;
  }
}

if (require.main === module) main();

module.exports = {
  buildCorridorEntry,
  buildHydroEntries,
  buildLabelPairing,
  geometryDistance,
  isCorridorVisible,
  isHydroVisible,
  parseArgs,
  run,
};
