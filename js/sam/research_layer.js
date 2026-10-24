'use strict';

(function bootstrapResearchLayer(window) {
  const rawParams = new URLSearchParams(window.location.search);
  if (!rawParams.has('research') && !rawParams.has('research_sources')) return;
  (function installResearchLayer() {
  const Core = window.SamResearchLayerCore;
  const Contract = window.SamResearchContract;
  if (!Core || !Contract) {
    // Fail closed and visibly: index.html must load research_contract.js and
    // research_layer_core.js before this file.
    const missing = [!Core && 'SamResearchLayerCore', !Contract && 'SamResearchContract'].filter(Boolean).join(', ');
    const message = `研究图层未启用：缺少 ${missing}（检查 index.html 的 script 顺序）`;
    console.error(message);
    window.addEventListener('DOMContentLoaded', () => {
      const node = document.createElement('div');
      node.className = 'sam-research-fatal';
      node.textContent = message;
      node.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#7a1f1f;color:#fff;padding:6px 10px;font:12px sans-serif;border-radius:4px';
      document.body.appendChild(node);
    });
    return;
  }
  const parsed = Core.parseResearchParams(window.location.search);
  if (!parsed.enabled && !parsed.error) return;

  let researchDate = null;
  try { researchDate = Core.parseResearchDate(window.location.search); } catch (error) { parsed.error = error.message; }
  const state = { ready: false, enabled: true, dataset: null, sources: null, inventory: null, researchDate, error: parsed.error, errors: [] };
  let panel;

  function reportError(category, errors) {
    state.ready = false;
    state.error = category;
    state.errors = errors || [];
    console.error('Sam research layer error:', category, state.errors);
    renderPanel();
  }

  function panelText() {
    if (state.error) return `研究图层未启用\n${state.error}\n${state.errors.slice(0, 5).map((item) => `${item.code || 'E_CONFIG'} ${item.path || item.legacy_id || '/'}`).join('\n')}`;
    const app = window.atlasApp;
    const year = app ? app.year : '—';
    const visible = state.ready ? Core.computeVisible(state.dataset, year, state.researchDate) : [];
    const drawable = visible.filter((feature) => feature.geometry !== null);
    const withoutGeometry = visible.length - drawable.length;
    const suppressed = state.ready ? Core.computeSuppressed(visible, state.enabled) : [];
    const unknown = state.ready ? state.dataset.features.filter((feature) => (feature.properties.valid.from_status === 'unknown' || feature.properties.valid.to_status === 'unknown') && feature.properties.review_state !== 'rejected' && feature.properties.review_state !== 'superseded').length : 0;
    const meta = state.dataset.meta;
    const fronts = visible.filter((feature) => feature.properties.feature_type === 'flood_front' && feature.properties.observed);
    const starts = fronts.map((feature) => feature.properties.observed.date_from).filter(Boolean).sort();
    const ends = fronts.map((feature) => feature.properties.observed.date_to).filter(Boolean).sort();
    const frontSummary = `本年泛滥前锋 ${fronts.length}${starts.length ? `；观测日期 [${starts[0]}, ${ends[ends.length - 1]}) 半开` : ''}${state.researchDate ? `；筛选日期 ${state.researchDate}` : ''}`;
    return `${meta.dataset_id}\nrevision ${meta.dataset_revision}; ${meta.stage}${meta.synthetic === true ? '\nSYNTHETIC / 非史料' : ''}\n年份 ${year}；可见 ${visible.length}；可绘制要素 ${drawable.length}；无几何要素 ${withoutGeometry}；压制旧条目 ${suppressed.length}；年代未知未显示 ${unknown}\n${frontSummary}${drawable.length === 0 ? '\n本年无研究数据' : ''}`;
  }

  function renderPanel() {
    if (!document.body) return;
    if (!panel) {
      const style = document.createElement('style');
      style.textContent = '#sam-research-layer-status{position:fixed;right:12px;bottom:12px;z-index:30;max-width:290px;padding:8px 10px;background:#fffdf0e8;border:1px solid #856f36;border-radius:4px;color:#332b19;font:12px/1.4 sans-serif;white-space:pre-wrap}#sam-research-layer-status label{display:block;margin-top:6px}#sam-research-layer-status .sam-synthetic{color:#a40000;font-weight:700}';
      document.head.appendChild(style);
      panel = document.createElement('section');
      panel.id = 'sam-research-layer-status';
      document.body.appendChild(panel);
    }
    panel.replaceChildren();
    const text = document.createElement('div');
    text.textContent = panelText();
    if (state.ready && state.dataset.meta.synthetic === true) text.className = 'sam-synthetic';
    panel.appendChild(text);
    if (!state.error) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = state.enabled;
      input.addEventListener('change', () => { state.enabled = input.checked; const app = window.atlasApp; if (app) { app._buildTerrainRivers(); if (typeof app._rescaleSvgTypography === 'function') app._rescaleSvgTypography(); } renderPanel(); });
      label.append(input, ' 显示研究图层');
      panel.appendChild(label);
    }
  }

  if (parsed.error) { reportError('配置错误', [{ code: 'E_CONFIG', path: '/', message: parsed.error }]); return; }
  const Controller = window.HistoricalAtlasController;
  if (!Controller || !Controller.prototype || typeof Controller.prototype._hydroMask !== 'function' || typeof Controller.prototype._buildTerrainRivers !== 'function') {
    reportError('与当前上游版本不兼容', [{ code: 'E_COMPAT', path: '/HistoricalAtlasController' }]);
    return;
  }
  const originalHydroMask = Controller.prototype._hydroMask;
  const originalBuildTerrainRivers = Controller.prototype._buildTerrainRivers;
  const wrapperMarker = typeof Symbol === 'function' ? Symbol('samResearchLayerWrapper') : '__samResearchLayerWrapper__';

  const wrappedHydroMask = function wrappedHydroMask(year) {
    const original = originalHydroMask.call(this, year);
    if (!state.ready) return original;
    const y = year === undefined ? this.year : year;
    const mask = `${original}|${Core.researchMask(state.dataset, y, state.enabled)}`;
    renderPanel();
    return mask;
  };
  wrappedHydroMask[wrapperMarker] = true;
  Controller.prototype._hydroMask = wrappedHydroMask;
  const wrappedBuildTerrainRivers = function wrappedBuildTerrainRivers() {
    if (!state.ready) return originalBuildTerrainRivers.call(this);
    const visible = Core.computeVisible(state.dataset, this.year, state.researchDate);
    const suppressed = new Set(Core.computeSuppressed(visible, state.enabled));
    const originalData = this.hydroData;
    const filteredData = {};
    const kinds = { rivers: 'river', lakes: 'lake', labels: 'label' };
    for (const key of Object.keys(kinds)) filteredData[key] = (originalData[key] || []).filter((item, index) => {
      const entry = state.inventory.entries.find((candidate) => candidate.kind === kinds[key] && candidate.index === index);
      return !entry || !suppressed.has(entry.legacy_id);
    });
    try {
      try { this.hydroData = filteredData; originalBuildTerrainRivers.call(this); } finally { this.hydroData = originalData; }
      const svg = this.grpRivers && this.grpRivers.ownerSVGElement;
      if (svg) {
        let group = svg.querySelector('#grp-sam-research');
        if (!group) { group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.id = 'grp-sam-research'; this.grpRivers.parentNode.insertBefore(group, this.grpRivers.nextSibling); }
        group.replaceChildren();
        const sourceById = new Map(state.sources.map((source) => [source.source_id, source]));
        const frontDates = visible.filter((feature) => feature.properties.feature_type === 'flood_front' && feature.properties.observed).map((feature) => feature.properties.observed.date_from).filter(Boolean).sort();
        const frontColor = (feature) => {
          if (feature.properties.feature_type !== 'flood_front' || !frontDates.length) return '#c96b79';
          const index = frontDates.indexOf(feature.properties.observed.date_from);
          const factor = frontDates.length < 2 ? 0.5 : index / (frontDates.length - 1);
          const channel = (light, dark) => Math.round(light + (dark - light) * factor).toString(16).padStart(2, '0');
          return `#${channel(216, 157)}${channel(143, 31)}${channel(154, 49)}`;
        };
        const titleText = (feature) => {
          const valid = feature.properties.valid;
          const claims = feature.properties.claims.map((claim) => { const source = sourceById.get(claim.source_id); return `${source ? source.title : claim.source_id}: ${claim.locator}`; }).join('\n');
          const observed = feature.properties.observed;
          const derivation = feature.properties.derivation;
          const observedText = observed === null || observed === undefined ? 'observed null' : `observed [${observed.date_from}, ${observed.date_to}) half-open; part_of_day=${observed.part_of_day}; as_written=${observed.as_written}`;
          const derivationText = derivation === null || derivation === undefined ? 'derivation null' : `derivation method=${derivation.method}; gcp_set_id=${derivation.gcp_set_id}; note=${derivation.note}`;
          return `${feature.id}\nvalid [${valid.from_status === 'known' ? valid.from : valid.from_status}, ${valid.to_status === 'known' ? valid.to : valid.to_status}) half-open\n${observedText}\n${derivationText}\n${feature.properties.evidence_mode}\n${feature.properties.review_state}\n${claims}`;
        };
        const appendTitle = (node, feature) => {
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          title.textContent = titleText(feature);
          node.appendChild(title);
        };
        for (const feature of visible) {
          if (!state.enabled || !feature.geometry) continue;
          if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
            for (const mark of Core.pointMarks(feature.geometry, (lon, lat) => this.projector.toScreen(lon, lat))) {
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', mark[0]); circle.setAttribute('cy', mark[1]); circle.setAttribute('r', '2.8');
              circle.setAttribute('data-feature-id', feature.id); circle.setAttribute('class', 'sam-research-point');
              circle.setAttribute('style', `--sam-front-fill:${frontColor(feature)}`);
              appendTitle(circle, feature); group.appendChild(circle);
              const labelText = feature.properties.feature_type === 'flood_front' ? Core.frontLabel(feature) : '';
              if (labelText) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', mark[0] + 4.5); label.setAttribute('y', mark[1] - 4.5);
                label.setAttribute('class', 'sam-research-front-label'); label.textContent = labelText;
                group.appendChild(label);
              }
            }
            continue;
          }
          const d = Core.featurePathData(feature.geometry, (lon, lat) => this.projector.toScreen(lon, lat));
          if (!d) continue;
          const shape = feature.geometry.type.includes('Polygon') ? 'polygon' : 'line';
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d); path.setAttribute('data-feature-id', feature.id);
          path.setAttribute('class', `sam-research-${shape} sam-evidence-${feature.properties.evidence_mode}`);
          if (shape === 'polygon') path.setAttribute('fill-rule', 'evenodd');
          appendTitle(path, feature); group.appendChild(path);
          const labelText = feature.properties.feature_type === 'flood_front' ? Core.frontLabel(feature) : '';
          const labelMark = labelText ? Core.featureLabelAnchor(feature.geometry, (lon, lat) => this.projector.toScreen(lon, lat)) : null;
          if (labelMark) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelMark[0] + 4.5); label.setAttribute('y', labelMark[1] - 4.5);
            label.setAttribute('class', 'sam-research-front-label'); label.textContent = labelText;
            group.appendChild(label);
          }
        }
      }
      this.activeHydroMask = this._hydroMask(this.year);
    } catch (error) {
      state.ready = false;
      try {
        this.hydroData = originalData;
        originalBuildTerrainRivers.call(this);
      } catch (recoveryError) {
        console.error('Sam research layer recovery error:', recoveryError);
      } finally {
        this.hydroData = originalData;
      }
      reportError('研究图层渲染失败', [{ code: 'E_RENDER', path: '/', message: error.message }]);
      return;
    }
    renderPanel();
  };
  wrappedBuildTerrainRivers[wrapperMarker] = true;
  Controller.prototype._buildTerrainRivers = wrappedBuildTerrainRivers;

  const style = document.createElement('style');
  style.textContent = '.sam-research-line,.sam-research-polygon{fill:none;stroke:#9d1f31;stroke-width:2.2;pointer-events:stroke}.sam-research-polygon{fill:#9d1f3133;pointer-events:all}.sam-research-point{fill:var(--sam-front-fill,#d98f9a);stroke:#9d1f31;stroke-width:.65;vector-effect:non-scaling-stroke;pointer-events:all}.sam-research-front-label{font-family:var(--serif-stack);font-size:6.2px;font-weight:600;fill:#9d1f31;pointer-events:none;paint-order:stroke fill;stroke:#fff7e6;stroke-width:1.3px;stroke-linejoin:round}.sam-evidence-reconstructed{stroke-dasharray:12 6}.sam-evidence-schematic{stroke-dasharray:2 5}.sam-evidence-hypothesis{stroke-dasharray:1 5;stroke-width:1.2;opacity:.55}';
  document.head.appendChild(style);

  let urls;
  try {
    const page = new URL(window.location.href);
    const sameOrigin = (value) => {
      const url = new URL(value, page.href);
      if (url.origin !== page.origin) throw new Error('research paths must resolve to the page origin');
      return url.href;
    };
    urls = [sameOrigin(parsed.dataPath), sameOrigin(parsed.sourcesPath), sameOrigin('docs/sam/audit/hydro_inventory.json')];
  } catch (error) {
    reportError('配置错误', [{ code: 'E_CONFIG', path: '/', message: error.message }]);
    return;
  }
  Promise.all(urls.map((url) => fetch(url)))
    .then((responses) => Promise.all(responses.map((response) => { if (!response.ok) throw new Error(`fetch failed: ${response.url} (${response.status})`); return response.json(); })))
    .then(async ([dataset, sources, inventory]) => {
      const validation = Contract.validateDataset({ dataset, sources, legacyInventory: inventory });
      if (validation.errors.length) return reportError('研究数据不合格', validation.errors);
      const ids = dataset.features.flatMap((feature) => feature.properties.supersedes);
      const drift = await Core.checkLegacyDrift(inventory, window.HYDRO_DATA, ids);
      if (drift.length) return reportError('上游水系数据已变动，替代关系需重核', drift);
      if (Controller.prototype._hydroMask !== wrappedHydroMask || Controller.prototype._buildTerrainRivers !== wrappedBuildTerrainRivers) {
        return reportError('与当前上游版本不兼容', [{ code: 'E_COMPAT', path: '/HistoricalAtlasController', message: 'research layer wrappers were replaced after installation' }]);
      }
      state.dataset = dataset; state.sources = sources; state.inventory = inventory; state.ready = true;
      const refresh = () => { const app = window.atlasApp; if (app) { app._buildTerrainRivers(); if (typeof app._rescaleSvgTypography === 'function') app._rescaleSvgTypography(); } renderPanel(); };
      if (window.atlasApp) refresh(); else window.addEventListener('DOMContentLoaded', refresh, { once: true });
    })
    .catch((error) => reportError('加载失败', [{ code: 'E_FETCH', path: '/', message: error.message }]));
  })();
})(window);
