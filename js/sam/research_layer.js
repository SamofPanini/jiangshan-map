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

  const state = { ready: false, enabled: true, dataset: null, sources: null, inventory: null, error: parsed.error, errors: [] };
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
    const visible = state.ready ? Core.computeVisible(state.dataset, year) : [];
    const suppressed = state.ready ? Core.computeSuppressed(visible, state.enabled) : [];
    const unknown = state.ready ? state.dataset.features.filter((feature) => (feature.properties.valid.from_status === 'unknown' || feature.properties.valid.to_status === 'unknown') && feature.properties.review_state !== 'rejected' && feature.properties.review_state !== 'superseded').length : 0;
    const meta = state.dataset.meta;
    return `${meta.dataset_id}\nrevision ${meta.dataset_revision}; ${meta.stage}${meta.synthetic === true ? '\nSYNTHETIC / 非史料' : ''}\n年份 ${year}；可见 ${visible.length}；压制旧条目 ${suppressed.length}；年代未知未显示 ${unknown}${visible.length === 0 ? '\n本年无研究数据' : ''}`;
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

  Controller.prototype._hydroMask = function wrappedHydroMask(year) {
    const original = originalHydroMask.call(this, year);
    if (!state.ready) return original;
    const y = year === undefined ? this.year : year;
    const mask = `${original}|${Core.researchMask(state.dataset, y, state.enabled)}`;
    renderPanel();
    return mask;
  };
  Controller.prototype._buildTerrainRivers = function wrappedBuildTerrainRivers() {
    if (!state.ready) return originalBuildTerrainRivers.call(this);
    const visible = Core.computeVisible(state.dataset, this.year);
    const suppressed = new Set(Core.computeSuppressed(visible, state.enabled));
    const originalData = this.hydroData;
    const filteredData = {};
    const kinds = { rivers: 'river', lakes: 'lake', labels: 'label' };
    for (const key of Object.keys(kinds)) filteredData[key] = (originalData[key] || []).filter((item, index) => {
      const entry = state.inventory.entries.find((candidate) => candidate.kind === kinds[key] && candidate.index === index);
      return !entry || !suppressed.has(entry.legacy_id);
    });
    try { this.hydroData = filteredData; originalBuildTerrainRivers.call(this); } finally { this.hydroData = originalData; }
    this.activeHydroMask = this._hydroMask(this.year);
    const svg = this.grpRivers && this.grpRivers.ownerSVGElement;
    if (svg) {
      let group = svg.querySelector('#grp-sam-research');
      if (!group) { group = document.createElementNS('http://www.w3.org/2000/svg', 'g'); group.id = 'grp-sam-research'; this.grpRivers.parentNode.insertBefore(group, this.grpRivers.nextSibling); }
      group.replaceChildren();
      const sourceById = new Map(state.sources.map((source) => [source.source_id, source]));
      for (const feature of visible) {
        if (!state.enabled || !feature.geometry) continue;
        const d = Core.featurePathData(feature.geometry, (lon, lat) => this.projector.toScreen(lon, lat));
        if (!d) continue;
        const shape = feature.geometry.type.includes('Polygon') ? 'polygon' : 'line';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d); path.setAttribute('data-feature-id', feature.id);
        path.setAttribute('class', `sam-research-${shape} sam-evidence-${feature.properties.evidence_mode}`);
        const valid = feature.properties.valid;
        const claims = feature.properties.claims.map((claim) => { const source = sourceById.get(claim.source_id); return `${source ? source.title : claim.source_id}: ${claim.locator}`; }).join('\n');
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${feature.id}\nvalid [${valid.from_status === 'known' ? valid.from : valid.from_status}, ${valid.to_status === 'known' ? valid.to : valid.to_status}) half-open\n${feature.properties.evidence_mode}\n${feature.properties.review_state}\n${claims}`;
        path.appendChild(title); group.appendChild(path);
      }
    }
    renderPanel();
  };

  const style = document.createElement('style');
  style.textContent = '.sam-research-line,.sam-research-polygon{fill:none;stroke:#9d1f31;stroke-width:2.2;pointer-events:stroke}.sam-research-polygon{fill:#9d1f3133;pointer-events:all}.sam-evidence-reconstructed{stroke-dasharray:12 6}.sam-evidence-schematic{stroke-dasharray:2 5}.sam-evidence-hypothesis{stroke-dasharray:1 5;stroke-width:1.2;opacity:.55}';
  document.head.appendChild(style);

  Promise.all([fetch(parsed.dataPath), fetch(parsed.sourcesPath), fetch('docs/sam/audit/hydro_inventory.json')])
    .then((responses) => Promise.all(responses.map((response) => { if (!response.ok) throw new Error(`fetch failed: ${response.url} (${response.status})`); return response.json(); })))
    .then(([dataset, sources, inventory]) => {
      const validation = Contract.validateDataset({ dataset, sources, legacyInventory: inventory });
      if (validation.errors.length) return reportError('研究数据不合格', validation.errors);
      const ids = dataset.features.flatMap((feature) => feature.properties.supersedes);
      const drift = Core.checkLegacyDrift(inventory, window.HYDRO_DATA, ids);
      if (drift.length) return reportError('上游水系数据已变动，替代关系需重核', drift);
      state.dataset = dataset; state.sources = sources; state.inventory = inventory; state.ready = true;
      const refresh = () => { const app = window.atlasApp; if (app) { app._buildTerrainRivers(); if (typeof app._rescaleSvgTypography === 'function') app._rescaleSvgTypography(); } renderPanel(); };
      if (window.atlasApp) refresh(); else window.addEventListener('DOMContentLoaded', refresh, { once: true });
    })
    .catch((error) => reportError('加载失败', [{ code: 'E_FETCH', path: '/', message: error.message }]));
  })();
})(window);
