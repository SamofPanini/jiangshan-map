'use strict';
const core = require('../../../tools/sam/georef/georef_core.js');
let s = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', x => s += x); process.stdin.on('end', () => {
  try { const q = JSON.parse(s); const f = q.kind === 'affine' ? core.fitAffine : core.fitPoly2; const t = f(q.points); const residuals = core.residuals(t,q.points); const loo = q.loo ? core.looResiduals(q.kind,q.points) : []; console.log(JSON.stringify({transform:t,residuals,loo,rms:core.rms(residuals)})); }
  catch(e) { console.error(e.message); process.exitCode=1; }
});
