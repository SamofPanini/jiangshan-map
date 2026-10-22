'use strict';

(function attachLegacyFingerprint(root) {
  function nullable(value) {
    return value === undefined ? null : value;
  }

  function nameFor(kind, item) {
    const name = kind === 'label' ? item && item.zh : item && item.name;
    if (typeof name !== 'string') throw new Error(`${kind} must have a string name field`);
    return name;
  }

  function coordinatesFor(kind, item) {
    if (kind === 'river') return item && item.lines;
    if (kind === 'lake') return item && item.rings;
    if (kind === 'label') return item && item.coord;
    throw new Error(`unsupported legacy kind: ${kind}`);
  }

  function canonicalString(kind, item) {
    return JSON.stringify({
      kind,
      name: nameFor(kind, item),
      rank: nullable(item.rank),
      appear: nullable(item.appear),
      vanish: nullable(item.vanish),
      coordinates: coordinatesFor(kind, item),
    });
  }

  function fingerprintNode(kind, item) {
    if (typeof require !== 'function') throw new Error('Node crypto is unavailable');
    return require('node:crypto').createHash('sha256').update(canonicalString(kind, item)).digest('hex').slice(0, 12);
  }

  async function fingerprintBrowser(kind, item) {
    if (!root.crypto || !root.crypto.subtle || typeof root.crypto.subtle.digest !== 'function') throw new Error('Web Crypto is unavailable');
    const bytes = new TextEncoder().encode(canonicalString(kind, item));
    const digest = await root.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
  }

  function fingerprint(kind, item) {
    return typeof require === 'function' ? fingerprintNode(kind, item) : fingerprintBrowser(kind, item);
  }

  const api = { canonicalString, fingerprint, fingerprintNode, fingerprintBrowser };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SamLegacyFingerprint = api;
})(globalThis);
