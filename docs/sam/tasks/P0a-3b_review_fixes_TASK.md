# 任务单 P0a-3b｜按 R2 审核处置修复研究图层

- task_id：`jsm-p0a3b-fixes`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：active

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. `docs/sam/audit/R2_REVIEW.md` 全文，**尤其末尾"我方逐条处置"表——那是本单的权威范围**。每条发现里的"反例输入"就是你要写成回归测试的输入。
3. 本单全文。
4. 不运行 `git status` / `git diff` 以外的全库扫描；不 commit；`js/app.js` 只按行号区间读。vault 外运行，vault guard 不在场。
5. `docs/sam/audit/P0b_huanghe_1938_sources.md` 由另一个执行者在写，不要读改。

## 1. 白名单

- `js/sam/research_layer_core.js`、`js/sam/research_layer.js`
- `js/sam/legacy_fingerprint.js`（新建，见 §2 R2-04）
- `scripts/sam/hydro_inventory.js`（**只允许**把指纹规范化改为调用 `js/sam/legacy_fingerprint.js`；产物必须逐字节不变）
- `scripts/sam/research_layer_core.test.js`、`scripts/sam/hydro_inventory.test.js`
- `scripts/sam/fixtures/research_demo/demo_synthetic.geojson`
- `index.html`：**只允许**在 `js/sam/research_layer_core.js` 那行之前新增一行 `<script src="js/sam/legacy_fingerprint.js"></script>`（不带 `?v=`）
- `docs/sam/audit/P0a-3b_REPORT.md`（新建）

## 2. 修复（逐条对应 R2 编号）

- **R2-01**：只有 geometry 非 null 的可见要素才进入压制集。横幅分别显示"可绘制要素数"与"无几何要素数"；本年可绘制要素为 0 时显示"本年无研究数据"。
- **R2-02**：研究掩码对 id 列表与压制列表用 `JSON.stringify` 编码（或其他无歧义编码），不得用分隔符直接拼接。
- **R2-03**：`parseResearchParams` 对两个路径做白名单校验：只允许字符 `[A-Za-z0-9_./-]`；不得以 `/` 开头；不得含 `..` 段或空段；必须以 `.geojson` 或 `.json` 结尾。胶水层在 fetch 前再用 `new URL(path, window.location.href)` 断言 `origin` 与页面相同，否则配置错误。
- **R2-04**：
  - 新建 `js/sam/legacy_fingerprint.js`（Node 用 `module.exports`、浏览器挂 `globalThis.SamLegacyFingerprint`），导出"给定 kind 与条目，生成规范化字符串"的函数——**规则与 `scripts/sam/hydro_inventory.js` 现有 `fingerprint()` 逐字一致**；`hydro_inventory.js` 改为调用它。
  - sha256：Node 用 `crypto`，浏览器用 `crypto.subtle.digest`（异步；加载流程本来就是异步的）。
  - 漂移检查改为：按清点的 `kind`/`index` 取当前条目，重算 `fp` 与清点 `fp` 比对；不一致即报错并点名 legacy_id。保留原来的名称/年代比对作为附加信息。
  - 测试：①`legacy_fingerprint.js` 对真实 `js/china_geo_data.js` 的全部 290 条重算 `fp`，与 `docs/sam/audit/hydro_inventory.json` 逐条相同；②R2-04 的反例（只改一个坐标、点数不变）⇒ 报漂移；③重跑生成器后 `docs/sam/audit/*.json` 与 HEAD 逐字节相同（`git diff --exit-code`）。
- **R2-05**：Polygon 与 MultiPolygon 的 path 加 `fill-rule="evenodd"`；把现有测试里 3 点的内环改成合法的闭合环（≥4 点）；补 R2-05 反例测试（断言生成的元素带 evenodd）。
- **R2-06**：研究 DOM 段（插入 group、绘制）包在 try/catch 中；失败时恢复未过滤的 `hydroData` 并**再调用一次原始 `_buildTerrainRivers`**，然后显示错误，状态置为未就绪。补测试（可用 vm ＋ 最小假 DOM）。
- **R2-07**：就绪时复核原型上的两个方法仍是本模块的包装函数（例如用一个 Symbol 标记）；不是则报配置错误、不渲染。
- **R2-09**：演示数据补一条 `to_status: unknown` 的要素（几何同样必须一眼看出是人造的）；补测试。
- **R2-08**：不改代码。

## 3. 验证（报告附真实输出）

1. 所有测试：`research_layer_core.test.js`、`hydro_inventory.test.js`、`validate_research.test.js` 全部通过；
2. R2_REVIEW 中 R2-01 至 R2-07、R2-09 的反例逐条已成为测试，列出测试名与对应编号；
3. `git diff -- index.html` 全文；
4. 演示数据过 `validate_research.js` 的输出；
5. `node scripts/validate_atlas.js`：等不到结束就如实写"未能完成"；
6. 浏览器内的行为写明"待主会话浏览器终验"，并给出建议检查的 URL（含 R2-03 的三种恶意路径）与预期；
7. 「本单里的数与你实测有出入吗？」；
8. 最后一行：`P0a-3b DONE`。
