'use strict';

(function attachResearchLayerCore(root) {
  function parseResearchParams(search) {
    const params = new URLSearchParams(search || '');
    const data = params.get('research');
    const sources = params.get('research_sources');
    if (data === null && sources === null) return { enabled: false, error: null };
    if (!data || !sources) return { enabled: false, error: 'research and research_sources must be supplied together' };
    const invalid = (value) => value.startsWith('http:') || value.startsWith('https:') || value.startsWith('//')
      || value.startsWith('/') || value.split('/').includes('..');
    if (invalid(data) || invalid(sources)) return { enabled: false, error: 'research paths must be repository-relative paths without .. segments' };
    return { enabled: true, dataPath: data, sourcesPath: sources, error: null };
  }

  function isFeatureVisible(feature, year) {
    const valid = feature && feature.properties && feature.properties.valid;
    const props = feature && feature.properties;
    if (!valid || !props || valid.from_status === 'unknown' || valid.to_status === 'unknown') return false;
    if (props.review_state === 'rejected' || props.review_state === 'superseded') return false;
    if (valid.from_status === 'known' && year < valid.from) return false;
    if (valid.to_status === 'known' && year >= valid.to) return false;
    return true;
  }

  function computeVisible(dataset, year) {
    return (dataset && Array.isArray(dataset.features) ? dataset.features : []).filter((feature) => isFeatureVisible(feature, year));
  }

  function computeSuppressed(visibleFeatures, enabled) {
    if (!enabled) return [];
    const ids = new Set();
    for (const feature of visibleFeatures || []) for (const id of feature.properties.supersedes || []) ids.add(id);
    return [...ids].sort();
  }

  function pointCount(item, kind) {
    if (kind === 'river') return (item.lines || []).reduce((count, line) => count + (Array.isArray(line) ? line.length : 0), 0);
    if (kind === 'lake') return (item.rings || []).reduce((count, ring) => count + (Array.isArray(ring) ? ring.length : 0), 0);
    return Array.isArray(item.coord) ? 1 : 0;
  }

  function checkLegacyDrift(inventory, hydroData, ids) {
    const entries = inventory && Array.isArray(inventory.entries) ? inventory.entries : [];
    const errors = [];
    for (const legacyId of [...new Set(ids || [])].sort()) {
      const entry = entries.find((candidate) => candidate.legacy_id === legacyId);
      if (!entry) {
        errors.push({ code: 'E_LEGACY_DRIFT', legacy_id: legacyId, message: 'legacy id is absent from inventory' });
        continue;
      }
      const collection = entry.kind === 'river' ? hydroData && hydroData.rivers : entry.kind === 'lake' ? hydroData && hydroData.lakes : entry.kind === 'label' ? hydroData && hydroData.labels : null;
      const item = Array.isArray(collection) ? collection[entry.index] : undefined;
      const labelOrName = entry.kind === 'label' ? item && item.zh : item && item.name;
      const nullable = (value) => value === undefined ? null : value;
      if (!item || labelOrName !== entry.name || nullable(item.rank) !== entry.rank
        || nullable(item.appear) !== entry.appear || nullable(item.vanish) !== entry.vanish
        || pointCount(item, entry.kind) !== entry.point_count) {
        errors.push({ code: 'E_LEGACY_DRIFT', legacy_id: legacyId, message: 'inventory entry does not match current HYDRO_DATA' });
      }
    }
    return errors;
  }

  function researchMask(dataset, year, enabled) {
    const visible = computeVisible(dataset, year);
    const visibleIds = visible.map((feature) => feature.id).sort();
    const suppressed = computeSuppressed(visible, enabled);
    return [dataset && dataset.meta ? dataset.meta.dataset_revision : '', visibleIds.join(','), suppressed.join(','), enabled ? 'on' : 'off'].join('|');
  }

  function featurePathData(geometry, toScreen) {
    if (!geometry || typeof toScreen !== 'function') return '';
    const point = (coordinate) => {
      const projected = toScreen(coordinate[0], coordinate[1]);
      return `${projected[0]} ${projected[1]}`;
    };
    const line = (coordinates, close) => coordinates.length ? `M${point(coordinates[0])}${coordinates.slice(1).map((coordinate) => `L${point(coordinate)}`).join('')}${close ? 'Z' : ''}` : '';
    if (geometry.type === 'LineString') return line(geometry.coordinates, false);
    if (geometry.type === 'MultiLineString') return geometry.coordinates.map((coordinates) => line(coordinates, false)).join('');
    if (geometry.type === 'Polygon') return geometry.coordinates.map((ring) => line(ring, true)).join('');
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap((polygon) => polygon.map((ring) => line(ring, true))).join('');
    return '';
  }

  const api = { parseResearchParams, isFeatureVisible, computeVisible, computeSuppressed, checkLegacyDrift, researchMask, featurePathData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SamResearchLayerCore = api;
})(globalThis);
