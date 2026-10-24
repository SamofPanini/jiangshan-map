'use strict';

/* Pure coordinate and export helpers.  The browser wrapper is deliberately not
 * needed here, so this file can be used unchanged by node:assert tests. */
(function attach(root) {
  const EPS = 1e-12;

  function pointOf(pair) {
    const p = pair && (pair.pixel || pair);
    const c = pair && (pair.coordinate || pair);
    const x = Number(p && p.x !== undefined ? p.x : pair && pair.x);
    const y = Number(p && p.y !== undefined ? p.y : pair && pair.y);
    const lon = Number(c && c.lon !== undefined ? c.lon : pair && pair.lon);
    const lat = Number(c && c.lat !== undefined ? c.lat : pair && pair.lat);
    if (![x, y, lon, lat].every(Number.isFinite)) throw new TypeError('control point requires finite x, y, lon, lat');
    return { x, y, lon, lat };
  }

  function activePairs(pairs) {
    if (!Array.isArray(pairs)) throw new TypeError('pairs must be an array');
    return pairs.reduce((result, pair, index) => {
      if (!pair.disabled) result.push({ ...pointOf(pair), id: pair.id || `control-${index}`, index, name: pair.name || '' });
      return result;
    }, []);
  }

  function solve(matrix, vector) {
    const n = vector.length;
    const a = matrix.map((row, i) => row.slice().concat(vector[i]));
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      if (Math.abs(a[pivot][col]) < EPS) throw new Error('degenerate control points: transformation is not solvable');
      [a[col], a[pivot]] = [a[pivot], a[col]];
      const divisor = a[col][col];
      for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
      }
    }
    return a.map((row) => row[n]);
  }

  function leastSquares(rows, values) {
    const n = rows[0].length;
    const normal = Array.from({ length: n }, () => Array(n).fill(0));
    const rhs = Array(n).fill(0);
    rows.forEach((row, i) => {
      for (let a = 0; a < n; a += 1) {
        rhs[a] += row[a] * values[i];
        for (let b = 0; b < n; b += 1) normal[a][b] += row[a] * row[b];
      }
    });
    return solve(normal, rhs);
  }

  function fit(kind, pairs) {
    const points = activePairs(pairs);
    const terms = kind === 'affine'
      ? (p) => [1, p.x, p.y]
      : (p) => [1, p.x, p.y, p.x * p.x, p.x * p.y, p.y * p.y];
    const required = kind === 'affine' ? 3 : 6;
    if (points.length < required) throw new Error(`${kind} needs at least ${required} active control points`);
    const rows = points.map(terms);
    return {
      kind,
      lon: leastSquares(rows, points.map((p) => p.lon)),
      lat: leastSquares(rows, points.map((p) => p.lat)),
      count: points.length,
    };
  }

  function fitAffine(pairs) { return fit('affine', pairs); }
  function fitPoly2(pairs) { return fit('poly2', pairs); }

  function applyTransform(transform, x, y) {
    if (!transform || !['affine', 'poly2'].includes(transform.kind)) throw new TypeError('unknown transformation');
    if (![x, y].every(Number.isFinite)) throw new TypeError('pixel coordinates must be finite');
    const terms = transform.kind === 'affine' ? [1, x, y] : [1, x, y, x * x, x * y, y * y];
    if (!Array.isArray(transform.lon) || !Array.isArray(transform.lat) || transform.lon.length !== terms.length || transform.lat.length !== terms.length) throw new TypeError('invalid transformation parameters');
    const dot = (coeffs) => coeffs.reduce((sum, value, i) => sum + value * terms[i], 0);
    return { lon: dot(transform.lon), lat: dot(transform.lat) };
  }

  function haversineM(a, b) {
    const lat1 = Number(a.lat); const lon1 = Number(a.lon); const lat2 = Number(b.lat); const lon2 = Number(b.lon);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) throw new TypeError('haversine points require finite lat/lon');
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad; const dLon = (lon2 - lon1) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function residuals(transform, pairs) {
    return activePairs(pairs).map((pair) => {
      const predicted = applyTransform(transform, pair.x, pair.y);
      return { ...pair, meters: haversineM(predicted, pair), predicted };
    });
  }

  function looResiduals(kind, pairs) {
    const points = activePairs(pairs);
    const minimum = kind === 'affine' ? 3 : 6;
    return points.map((point, index) => {
      if (points.length - 1 < minimum) return { ...point, meters: null, unavailable: 'too few remaining active control points' };
      const rest = points.filter((_, i) => i !== index);
      try {
        const transform = kind === 'affine' ? fitAffine(rest) : fitPoly2(rest);
        return { ...point, meters: haversineM(applyTransform(transform, point.x, point.y), point) };
      } catch (error) {
        return { ...point, meters: null, unavailable: error.message };
      }
    });
  }

  function rms(residualList) {
    const usable = residualList.filter((item) => Number.isFinite(item.meters));
    return usable.length ? Math.sqrt(usable.reduce((sum, item) => sum + item.meters ** 2, 0) / usable.length) : null;
  }

  function transformFor(state) {
    const points = state.controlPoints || [];
    if (state.transform) return state.transform;
    return state.transformKind === 'poly2' ? fitPoly2(points) : fitAffine(points);
  }

  function imageBinding(state) {
    const sha = state && state.imageSha256;
    const gcpSha = state && state.gcpImageSha256;
    if (typeof sha !== 'string' || !sha || typeof gcpSha !== 'string' || !gcpSha) return { ok: false, code: 'E_IMAGE_SHA', message: '图像 SHA-256 或控制点所属 SHA-256 未知' };
    if (sha !== gcpSha) return { ok: false, code: 'E_IMAGE_SHA', message: '图像 SHA-256 与控制点所属 SHA-256 不一致' };
    const dimensions = ['imageWidth', 'imageHeight', 'gcpImageWidth', 'gcpImageHeight'];
    if (!dimensions.every((key) => Number.isFinite(state[key]) && state[key] > 0)) return { ok: false, code: 'E_IMAGE_SIZE', message: '图像或控制点所属图像的宽高未知' };
    if (state.imageWidth !== state.gcpImageWidth || state.imageHeight !== state.gcpImageHeight) return { ok: false, code: 'E_IMAGE_SIZE', message: '图像宽高与控制点所属图像不一致' };
    return { ok: true, code: null, message: '' };
  }

  function exportReadiness(state, kind) {
    const binding = imageBinding(state);
    if (!binding.ok) return binding;
    if (kind === 'geojson') {
      const minimum = state.transformKind === 'poly2' ? 6 : 3;
      const active = activePairs(state.controlPoints || []).length;
      if (active < minimum + 1) return { ok: false, code: 'E_REDUNDANCY', message: `无冗余，RMS 不代表误差；${state.transformKind === 'poly2' ? '二次' : '仿射'}导出至少需要 ${minimum + 1} 个启用控制点` };
    }
    return { ok: true, code: null, message: '' };
  }

  function requireReady(state, kind) {
    const result = exportReadiness(state, kind);
    if (!result.ok) throw new Error(result.message);
  }

  function buildGcpSet(state) {
    requireReady(state, 'gcp');
    const transform = transformFor(state);
    const residual = residuals(transform, state.controlPoints || []);
    const loo = looResiduals(transform.kind, state.controlPoints || []);
    const byId = new Map(loo.map((item) => [item.id, item]));
    return {
      gcp_set_id: state.gcpSetId || `${state.imageLabel || 'image'}-${new Date().toISOString().slice(0, 10)}`,
      image_label: state.imageLabel || '',
      image_sha256: state.imageSha256 || null,
      image_width: state.imageWidth || null,
      image_height: state.imageHeight || null,
      control_points: (state.controlPoints || []).map((item) => {
        const point = pointOf(item);
        const id = item.id || `control-${(state.controlPoints || []).indexOf(item)}`;
        const fitResidual = residual.find((entry) => entry.id === id);
        return {
          id: item.id || null, name: item.name || '', pixel: { x: point.x, y: point.y }, lat: point.lat, lon: point.lon,
          source_url: item.source_url || null, disabled: Boolean(item.disabled),
          residual_meters: fitResidual ? fitResidual.meters : null,
          loo_residual_meters: byId.get(id) ? byId.get(id).meters : null,
        };
      }),
      transform_type: transform.kind,
      transform: { lon: transform.lon, lat: transform.lat },
      rms_meters: rms(residual),
      loo_residuals_meters: (state.controlPoints || []).map((item, index) => {
        if (item.disabled) return null;
        const value = (byId.get(item.id || `control-${index}`) || {}).meters;
        return Number.isFinite(value) ? value : null;
      }),
    };
  }

  function datePlusOne(date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    return parsed.toISOString().slice(0, 10);
  }

  function buildDataset(state) {
    requireReady(state, 'geojson');
    const transform = transformFor(state);
    const gcp = buildGcpSet({ ...state, transform });
    const features = (state.features || []).map((feature, index) => {
      const projected = (feature.points || []).map((point) => applyTransform(transform, point.x, point.y));
      const coordinates = projected.map((point) => [point.lon, point.lat]);
      const geometry = feature.mode === 'line'
        ? { type: 'LineString', coordinates }
        : { type: 'Point', coordinates: coordinates[0] || [] };
      const from = feature.date_from || '';
      const to = feature.date_to || (from ? datePlusOne(from) : '');
      return {
        type: 'Feature', id: feature.id || `georef-${index + 1}`, geometry,
        properties: {
          region: state.region || 'cn', feature_type: feature.feature_type || 'flood_front', waterbody_id: feature.waterbody_id || '',
          segment_id: feature.segment_id || '', interpretation_id: feature.interpretation_id || '',
          valid: { from: null, to: null, interval: 'half_open', from_status: 'unknown', to_status: 'unknown' },
          original_dating: feature.original_dating || null, evidence_mode: 'attested', review_state: 'proposed',
          dating_uncertainty: { years: null, reason: 'digitization tool does not quantify dating uncertainty' },
          spatial_error: { meters: gcp.rms_meters, reason: '控制点 RMS，非单点误差' },
          geometry_absent_reason: null, license_status: 'unknown',
          claims: [{ claim_id: `${feature.id || `georef-${index + 1}`}-source`, source_id: state.sourceId || '', supports: ['geometry', 'dating'], locator: feature.locator || '' }],
          supersedes: [], observed: (from || to || feature.as_written || feature.part_of_day) ? { date_from: from, date_to: to, part_of_day: feature.part_of_day || null, as_written: feature.as_written || '' } : null,
          derivation: { method: transform.kind === 'poly2' ? 'georef_polynomial' : 'georef_affine', gcp_set_id: gcp.gcp_set_id, note: feature.note || null },
        },
      };
    });
    return {
      type: 'FeatureCollection',
      meta: { schema_version: '0.2.0', dataset_id: state.datasetId || gcp.gcp_set_id, dataset_revision: 'draft-1', region: state.region || 'cn', stage: 'draft', synthetic: false, description: state.description || 'Digitized with Sam georeferencing tool.' },
      features,
    };
  }

  const api = { fitAffine, fitPoly2, applyTransform, haversineM, residuals, looResiduals, buildGcpSet, buildDataset, rms, imageBinding, exportReadiness };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SamGeorefCore = api;
}(typeof globalThis === 'undefined' ? null : globalThis));
