'use strict';

const SCHEMA_VERSION = '0.1.0';
const REGIONS = Object.freeze({ cn: Object.freeze({ bbox: Object.freeze([70, 15, 140, 56]) }) });
const FEATURE_TYPES = Object.freeze(['river_course', 'river_branch', 'flood_extent', 'lake', 'wetland', 'canal', 'coastline']);
const EVIDENCE_MODES = Object.freeze(['attested', 'reconstructed', 'schematic', 'hypothesis']);
const REVIEW_STATES = Object.freeze(['proposed', 'under_review', 'accepted', 'rejected', 'superseded']);
const LICENSE_STATUSES = Object.freeze(['unknown', 'restricted', 'cleared']);
const SOURCE_KINDS = Object.freeze(['original_map', 'editor_reconstruction', 'modern_baseline', 'text', 'dataset']);
const ABSENT_REASONS = Object.freeze(['not_located', 'unknown_extent', 'restricted']);
const SUPPORTS = Object.freeze(['geometry', 'dating', 'name', 'existence']);
const GEOMETRY_TYPES = Object.freeze(['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']);

const TOP_KEYS = ['type', 'meta', 'features'];
const META_KEYS = ['schema_version', 'dataset_id', 'dataset_revision', 'region', 'stage', 'synthetic', 'description'];
const FEATURE_KEYS = ['type', 'id', 'geometry', 'properties'];
const PROPERTIES_KEYS = ['region', 'feature_type', 'waterbody_id', 'segment_id', 'interpretation_id', 'valid', 'original_dating', 'evidence_mode', 'review_state', 'dating_uncertainty', 'spatial_error', 'geometry_absent_reason', 'license_status', 'claims', 'supersedes'];
const VALID_KEYS = ['from', 'to', 'interval', 'from_status', 'to_status'];
const CLAIM_KEYS = ['claim_id', 'source_id', 'supports', 'locator'];
const GEOMETRY_KEYS = ['type', 'coordinates'];
const SOURCE_KEYS = ['source_id', 'title', 'author_or_org', 'edition', 'url', 'source_kind', 'license_status', 'accessed', 'synthetic'];

function pointer(path, part) {
  return `${path}/${String(part).replace(/~/g, '~0').replace(/\//g, '~1')}`;
}

function validateDataset({ dataset, sources, legacyInventory }) {
  const errors = [];
  const warnings = [];
  const add = (code, path, message) => errors.push({ code, path, message });
  const warn = (code, path, message) => warnings.push({ code, path, message });
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const unknown = (value, allowed, path) => {
    if (!object(value)) return;
    for (const key of Object.keys(value)) if (!allowed.includes(key)) add('E_UNKNOWN_KEY', pointer(path, key), `unknown key: ${key}`);
  };
  const required = (value, keys, path) => {
    if (!object(value)) return;
    for (const key of keys) if (!own(value, key)) add('E_REQUIRED', pointer(path, key), `required key missing: ${key}`);
  };
  const string = (value, path, nullable = false) => {
    if (value === null && nullable) return;
    if (typeof value !== 'string') add('E_TYPE', path, nullable ? 'must be a string or null' : 'must be a string');
  };
  const enumeration = (value, choices, path) => {
    if (!choices.includes(value)) add('E_ENUM', path, `must be one of: ${choices.join(', ')}`);
  };
  const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
  const integer = (value) => Number.isInteger(value);

  if (!object(dataset) || dataset.type !== 'FeatureCollection' || !Array.isArray(dataset.features) || !object(dataset.meta)) {
    add('E_TOP_SHAPE', '', 'dataset must be a FeatureCollection with object meta and array features');
    return sorted(errors, warnings);
  }
  unknown(dataset, TOP_KEYS, '');
  required(dataset, TOP_KEYS, '');

  const meta = dataset.meta;
  unknown(meta, META_KEYS, '/meta');
  required(meta, META_KEYS, '/meta');
  if (own(meta, 'schema_version') && meta.schema_version !== SCHEMA_VERSION) add('E_SCHEMA_VERSION', '/meta/schema_version', `must equal ${SCHEMA_VERSION}`);
  for (const key of ['dataset_id', 'dataset_revision', 'description']) if (own(meta, key)) string(meta[key], pointer('/meta', key));
  if (own(meta, 'stage')) enumeration(meta.stage, ['draft', 'release'], '/meta/stage');
  if (own(meta, 'synthetic') && typeof meta.synthetic !== 'boolean') add('E_TYPE', '/meta/synthetic', 'must be a boolean');
  if (own(meta, 'region')) {
    string(meta.region, '/meta/region');
    if (!own(REGIONS, meta.region)) add('E_REGION', '/meta/region', 'region is not defined in REGIONS');
  }

  const sourceIds = new Set();
  if (!Array.isArray(sources)) {
    add('E_TYPE', '/sources', 'sources must be an array');
  } else {
    sources.forEach((source, index) => {
      const path = `/sources/${index}`;
      if (!object(source)) {
        add('E_TYPE', path, 'source must be an object');
        return;
      }
      unknown(source, SOURCE_KEYS, path);
      required(source, SOURCE_KEYS, path);
      for (const key of ['source_id', 'title', 'author_or_org']) if (own(source, key)) string(source[key], pointer(path, key));
      for (const key of ['edition', 'url']) if (own(source, key)) string(source[key], pointer(path, key), true);
      if (own(source, 'accessed')) {
        string(source.accessed, pointer(path, 'accessed'), true);
        if (typeof source.accessed === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(source.accessed)) add('E_TYPE', pointer(path, 'accessed'), 'must use YYYY-MM-DD format or null');
      }
      if (own(source, 'source_kind')) enumeration(source.source_kind, SOURCE_KINDS, pointer(path, 'source_kind'));
      if (own(source, 'license_status')) enumeration(source.license_status, LICENSE_STATUSES, pointer(path, 'license_status'));
      if (own(source, 'synthetic') && typeof source.synthetic !== 'boolean') add('E_TYPE', pointer(path, 'synthetic'), 'must be a boolean');
      if (typeof source.source_id === 'string') {
        if (sourceIds.has(source.source_id)) add('E_DUP_ID', pointer(path, 'source_id'), `duplicate source_id: ${source.source_id}`);
        sourceIds.add(source.source_id);
      }
      if (meta.stage === 'draft' && source.license_status === 'unknown') warn('W_LICENSE_UNKNOWN', pointer(path, 'license_status'), 'draft source license is unknown');
    });
  }

  const legacyIds = new Set(Array.isArray(legacyInventory && legacyInventory.entries)
    ? legacyInventory.entries.filter((entry) => object(entry) && typeof entry.legacy_id === 'string').map((entry) => entry.legacy_id)
    : []);
  const featureIds = new Set();
  const claimIds = new Set();
  const usedSourceIds = new Set();
  dataset.features.forEach((feature, index) => {
    const path = `/features/${index}`;
    if (!object(feature)) {
      add('E_TYPE', path, 'feature must be an object');
      return;
    }
    unknown(feature, FEATURE_KEYS, path);
    required(feature, FEATURE_KEYS, path);
    if (own(feature, 'type') && feature.type !== 'Feature') add('E_TYPE', `${path}/type`, 'must equal Feature');
    if (own(feature, 'id')) {
      string(feature.id, `${path}/id`);
      if (typeof feature.id === 'string') {
        if (featureIds.has(feature.id)) add('E_DUP_ID', `${path}/id`, `duplicate feature id: ${feature.id}`);
        featureIds.add(feature.id);
      }
    }
    validateGeometry(feature.geometry, `${path}/geometry`, meta.region, add, object, unknown, required, finiteNumber);
    const properties = feature.properties;
    if (!object(properties)) {
      add('E_TYPE', `${path}/properties`, 'properties must be an object');
      return;
    }
    const propsPath = `${path}/properties`;
    unknown(properties, PROPERTIES_KEYS, propsPath);
    required(properties, PROPERTIES_KEYS, propsPath);
    for (const key of ['region', 'waterbody_id', 'segment_id', 'interpretation_id']) if (own(properties, key)) string(properties[key], pointer(propsPath, key));
    if (own(properties, 'original_dating')) string(properties.original_dating, `${propsPath}/original_dating`, true);
    if (own(properties, 'feature_type')) enumeration(properties.feature_type, FEATURE_TYPES, `${propsPath}/feature_type`);
    if (own(properties, 'evidence_mode')) enumeration(properties.evidence_mode, EVIDENCE_MODES, `${propsPath}/evidence_mode`);
    if (own(properties, 'review_state')) enumeration(properties.review_state, REVIEW_STATES, `${propsPath}/review_state`);
    if (own(properties, 'license_status')) enumeration(properties.license_status, LICENSE_STATUSES, `${propsPath}/license_status`);
    if (properties.region !== meta.region) add('E_REGION', `${propsPath}/region`, 'feature region must equal meta.region');
    validateValid(properties.valid, `${propsPath}/valid`, add, object, unknown, required, integer);
    validateMeasure(properties.dating_uncertainty, `${propsPath}/dating_uncertainty`, 'years', add, object, unknown, required, finiteNumber);
    validateMeasure(properties.spatial_error, `${propsPath}/spatial_error`, 'meters', add, object, unknown, required, finiteNumber);
    if (!(properties.geometry_absent_reason === null || ABSENT_REASONS.includes(properties.geometry_absent_reason))) add('E_ENUM', `${propsPath}/geometry_absent_reason`, `must be null or one of: ${ABSENT_REASONS.join(', ')}`);
    if (feature.geometry === null && properties.geometry_absent_reason === null) add('E_GEOM_ABSENT', `${propsPath}/geometry_absent_reason`, 'null geometry requires an absent reason');
    if (feature.geometry !== null && properties.geometry_absent_reason !== null) add('E_GEOM_ABSENT', `${propsPath}/geometry_absent_reason`, 'non-null geometry forbids an absent reason');
    if (!Array.isArray(properties.claims)) {
      add('E_TYPE', `${propsPath}/claims`, 'claims must be an array');
    } else {
      properties.claims.forEach((claim, claimIndex) => {
        const claimPath = `${propsPath}/claims/${claimIndex}`;
        if (!object(claim)) {
          add('E_TYPE', claimPath, 'claim must be an object');
          return;
        }
        unknown(claim, CLAIM_KEYS, claimPath);
        required(claim, CLAIM_KEYS, claimPath);
        for (const key of ['claim_id', 'source_id', 'locator']) if (own(claim, key)) string(claim[key], pointer(claimPath, key));
        if (typeof claim.claim_id === 'string') {
          if (claimIds.has(claim.claim_id)) add('E_DUP_ID', `${claimPath}/claim_id`, `duplicate claim_id: ${claim.claim_id}`);
          claimIds.add(claim.claim_id);
        }
        if (!Array.isArray(claim.supports)) add('E_TYPE', `${claimPath}/supports`, 'supports must be an array');
        else claim.supports.forEach((support, supportIndex) => {
          if (!SUPPORTS.includes(support)) add('E_ENUM', `${claimPath}/supports/${supportIndex}`, `must be one of: ${SUPPORTS.join(', ')}`);
        });
        if (typeof claim.source_id === 'string') {
          usedSourceIds.add(claim.source_id);
          if (!sourceIds.has(claim.source_id)) add('E_SOURCE_REF', `${claimPath}/source_id`, `unknown source_id: ${claim.source_id}`);
        }
      });
      if (meta.stage === 'draft' && properties.claims.length === 0) warn('W_NO_CLAIMS', `${propsPath}/claims`, 'draft feature has no claims');
    }
    if (!Array.isArray(properties.supersedes)) add('E_TYPE', `${propsPath}/supersedes`, 'supersedes must be an array');
    else properties.supersedes.forEach((legacyId, legacyIndex) => {
      if (typeof legacyId !== 'string') add('E_TYPE', `${propsPath}/supersedes/${legacyIndex}`, 'legacy id must be a string');
      else if (!legacyIds.has(legacyId)) add('E_LEGACY_REF', `${propsPath}/supersedes/${legacyIndex}`, `unknown legacy_id: ${legacyId}`);
    });
    if (meta.stage === 'draft' && properties.license_status === 'unknown') warn('W_LICENSE_UNKNOWN', `${propsPath}/license_status`, 'draft feature license is unknown');
    if (meta.stage === 'release') validateRelease(feature, properties, path, add);
  });
  if (meta.stage === 'release') {
    if (meta.synthetic !== false) add('E_RELEASE', '/meta/synthetic', 'release dataset must be non-synthetic');
    if (Array.isArray(sources)) sources.forEach((source, index) => {
      if (usedSourceIds.has(source.source_id) && (source.license_status !== 'cleared' || source.synthetic !== false)) add('E_RELEASE', `/sources/${index}`, 'release-referenced source must be cleared and non-synthetic');
    });
  }
  return sorted(errors, warnings);
}

function validateRelease(feature, properties, featurePath, add) {
  if (properties.review_state !== 'accepted') add('E_RELEASE', `${featurePath}/properties/review_state`, 'release feature must be accepted');
  if (properties.license_status !== 'cleared') add('E_RELEASE', `${featurePath}/properties/license_status`, 'release feature license must be cleared');
  const supports = new Set((Array.isArray(properties.claims) ? properties.claims : []).flatMap((claim) => Array.isArray(claim.supports) ? claim.supports : []));
  if (!supports.has('dating')) add('E_RELEASE', `${featurePath}/properties/claims`, 'release feature needs a dating claim');
  if (feature.geometry !== null && !supports.has('geometry')) add('E_RELEASE', `${featurePath}/properties/claims`, 'release geometry needs a geometry claim');
}

function validateValid(valid, path, add, object, unknown, required, integer) {
  if (!object(valid)) {
    add('E_TYPE', path, 'valid must be an object');
    return;
  }
  unknown(valid, VALID_KEYS, path);
  required(valid, VALID_KEYS, path);
  if (valid.interval !== 'half_open') add('E_INTERVAL', `${path}/interval`, 'interval must be half_open');
  for (const side of ['from', 'to']) {
    const status = valid[`${side}_status`];
    const value = valid[side];
    if (!['known', 'open', 'unknown'].includes(status)) add('E_ENUM', `${path}/${side}_status`, 'status must be known, open, or unknown');
    if (status === 'known' && !integer(value)) add('E_INTERVAL', `${path}/${side}`, 'known endpoint needs an integer year');
    if ((status === 'open' || status === 'unknown') && value !== null) add('E_INTERVAL', `${path}/${side}`, 'open or unknown endpoint must be null');
    if (integer(value) && value === 0) add('E_INTERVAL', `${path}/${side}`, 'year zero is not allowed');
  }
  if (valid.from_status === 'known' && valid.to_status === 'known' && integer(valid.from) && integer(valid.to) && valid.from >= valid.to) add('E_INTERVAL', path, 'known from must be before known to');
}

function validateMeasure(measure, path, numberKey, add, object, unknown, required, finiteNumber) {
  if (!object(measure)) {
    add('E_TYPE', path, 'measure must be an object');
    return;
  }
  const keys = [numberKey, 'reason'];
  unknown(measure, keys, path);
  required(measure, keys, path);
  const value = measure[numberKey];
  if (!(value === null || typeof value === 'number')) add('E_TYPE', `${path}/${numberKey}`, 'must be a number or null');
  if (!(measure.reason === null || typeof measure.reason === 'string')) add('E_TYPE', `${path}/reason`, 'must be a string or null');
  if (value === null && measure.reason === null) add('E_NULL_REASON', path, 'numeric value and reason cannot both be null');
  if (typeof value === 'number' && (!finiteNumber(value) || value < 0)) add('E_NULL_REASON', `${path}/${numberKey}`, 'numeric value must be finite and non-negative');
}

function validateGeometry(geometry, path, region, add, object, unknown, required, finiteNumber) {
  if (geometry === null) return;
  if (!object(geometry)) {
    add('E_TYPE', path, 'geometry must be an object or null');
    return;
  }
  unknown(geometry, GEOMETRY_KEYS, path);
  required(geometry, GEOMETRY_KEYS, path);
  if (!GEOMETRY_TYPES.includes(geometry.type)) {
    add('E_GEOM_TYPE', `${path}/type`, `must be one of: ${GEOMETRY_TYPES.join(', ')}`);
    return;
  }
  if (!Array.isArray(geometry.coordinates)) {
    add('E_TYPE', `${path}/coordinates`, 'coordinates must be an array');
    return;
  }
  if (geometry.coordinates.length === 0) {
    add('E_EMPTY', `${path}/coordinates`, 'coordinates cannot be empty');
    return;
  }
  const bbox = REGIONS[region] && REGIONS[region].bbox;
  const point = (coordinate, pointPath) => {
    if (!Array.isArray(coordinate) || coordinate.length !== 2 || !coordinate.every(finiteNumber)) {
      add('E_COORD', pointPath, 'coordinate must be exactly two finite numbers');
      return false;
    }
    const [longitude, latitude] = coordinate;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      add('E_COORD', pointPath, 'coordinate is outside WGS84 bounds');
      return false;
    }
    if (bbox && (longitude < bbox[0] || longitude > bbox[2] || latitude < bbox[1] || latitude > bbox[3])) add('E_REGION_BBOX', pointPath, 'coordinate is outside the region bbox');
    return true;
  };
  const line = (coordinates, linePath) => {
    if (!Array.isArray(coordinates)) {
      add('E_TYPE', linePath, 'line must be an array');
      return;
    }
    if (coordinates.length === 0) {
      add('E_EMPTY', linePath, 'line cannot be empty');
      return;
    }
    coordinates.forEach((coordinate, index) => point(coordinate, `${linePath}/${index}`));
    if (coordinates.length < 2) add('E_LINE', linePath, 'line needs at least two points');
    for (let i = 1; i < coordinates.length; i += 1) if (samePoint(coordinates[i - 1], coordinates[i])) add('E_LINE', `${linePath}/${i}`, 'line has consecutive duplicate points');
  };
  const ring = (coordinates, ringPath) => {
    if (!Array.isArray(coordinates)) {
      add('E_TYPE', ringPath, 'ring must be an array');
      return;
    }
    if (coordinates.length === 0) {
      add('E_EMPTY', ringPath, 'ring cannot be empty');
      return;
    }
    coordinates.forEach((coordinate, index) => point(coordinate, `${ringPath}/${index}`));
    if (coordinates.length < 4 || !samePoint(coordinates[0], coordinates[coordinates.length - 1])) {
      add('E_RING', ringPath, 'ring needs at least four points and must be closed');
      return;
    }
    for (let i = 0; i < coordinates.length - 1; i += 1) for (let j = i + 1; j < coordinates.length - 1; j += 1) {
      if (j === i + 1 || (i === 0 && j === coordinates.length - 2)) continue;
      if (segmentsIntersect(coordinates[i], coordinates[i + 1], coordinates[j], coordinates[j + 1])) add('E_SELF_INTERSECT', ringPath, 'ring has non-adjacent intersecting edges');
    }
  };
  if (geometry.type === 'LineString') line(geometry.coordinates, `${path}/coordinates`);
  if (geometry.type === 'MultiLineString') geometry.coordinates.forEach((coordinates, index) => line(coordinates, `${path}/coordinates/${index}`));
  if (geometry.type === 'Polygon') geometry.coordinates.forEach((coordinates, index) => ring(coordinates, `${path}/coordinates/${index}`));
  if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach((polygon, polygonIndex) => {
    if (!Array.isArray(polygon) || polygon.length === 0) add('E_EMPTY', `${path}/coordinates/${polygonIndex}`, 'polygon cannot be empty');
    else polygon.forEach((coordinates, ringIndex) => ring(coordinates, `${path}/coordinates/${polygonIndex}/${ringIndex}`));
  });
}

function samePoint(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === 2 && right.length === 2 && left[0] === right[0] && left[1] === right[1];
}
function segmentsIntersect(a, b, c, d) {
  if (![a, b, c, d].every((point) => Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === 'number' && Number.isFinite(value)))) return false;
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const onSegment = (p, q, r) => Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) && Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
  const abC = cross(a, b, c); const abD = cross(a, b, d); const cdA = cross(c, d, a); const cdB = cross(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  return (abC === 0 && onSegment(a, c, b)) || (abD === 0 && onSegment(a, d, b)) || (cdA === 0 && onSegment(c, a, d)) || (cdB === 0 && onSegment(c, b, d));
}
function sorted(errors, warnings) {
  const compare = (left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message);
  return { errors: errors.sort(compare), warnings: warnings.sort(compare) };
}

module.exports = { SCHEMA_VERSION, REGIONS, FEATURE_TYPES, EVIDENCE_MODES, REVIEW_STATES, LICENSE_STATUSES, SOURCE_KINDS, ABSENT_REASONS, SUPPORTS, GEOMETRY_TYPES, validateDataset };
