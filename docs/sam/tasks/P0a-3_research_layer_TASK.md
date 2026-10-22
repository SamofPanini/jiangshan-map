# 任务单 P0a-3｜研究图层外挂模块 v0（开关、替代旧条目、来源提示、出错即停）

- task_id：`jsm-p0a3-layer`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：draft（等 R1 审核结论后定稿派发）
- 路线图位置：`docs/sam/ROADMAP.md` 第 5 项

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. `docs/sam/CONTRACT.md`（契约人读说明）与 `scripts/sam/research_contract.js`（机读正典）。
3. 本单全文。
4. `js/app.js` 只按行号区间读：`233-240`（类开头）、`584-600`（`_bindDom`）、`1118-1230`（水系渲染）、`4815-4825`（年份切换时的刷新判断）、文件末尾约 40 行（实例化与 `window.HistoricalAtlasController`）。**不要整份读入**（约 400KB）。
5. 不运行 `git status` / `git diff` 以外的全库扫描；不 commit；不安装依赖。本次在 vault 外运行，vault guard 不在场。

## 1. 目的与设计约束

在原地图上叠加研究数据图层，满足 ROADMAP 第 5 项：关掉即恢复原版；不出现"两条黄河"；刷新判断包含数据 revision；数据不合格时不渲染。

**核心设计（照此实现，不另选方案）**：`app.js` 在 `DOMContentLoaded` 之前已执行 `window.HistoricalAtlasController = HistoricalAtlasController`，实例化发生在 `DOMContentLoaded` 里。因此在 `app.js` 之后加载的脚本可以在实例化前**包装原型上的 `_hydroMask` 与 `_buildTerrainRivers`**，从而**不修改 `app.js` 任何一行**。

## 2. 白名单

| 路径 | 允许的改动 |
|---|---|
| `index.html` | **只允许**在 `js/app.js` 那行 `<script>` 之后紧接着新增两行：`<script src="scripts/sam/research_contract.js?v=sam1"></script>` 与 `<script src="js/sam/research_layer.js?v=sam1"></script>`。其他字节不得改动（用 `git diff` 证明只有这两行 `+`） |
| `js/sam/research_layer_core.js` | 新建：纯函数（无 DOM、无 fetch），Node 与浏览器都能加载（浏览器挂 `globalThis.SamResearchLayerCore`） |
| `js/sam/research_layer.js` | 新建：浏览器胶水层（原型包装、fetch、DOM、样式） |
| `scripts/sam/research_layer_core.test.js` | 新建：Node 测试 |
| `scripts/sam/fixtures/research_demo/` | 新建：演示数据集与来源（见 §5） |
| `docs/sam/audit/P0a-3_REPORT.md` | 新建：执行报告 |

## 3. 行为规格

### 3.1 开关（URL 参数）

- 只有 URL 同时带 `research=<数据集相对路径>` 与 `research_sources=<来源相对路径>` 时才启用；**两个都不带时，`research_layer.js` 什么都不做（不包装原型、不插入 DOM、不 fetch）**。只带一个 ⇒ 视为配置错误（见 3.5）。
- 路径必须是仓库内相对路径：以 `http:`、`https:`、`//`、`/` 开头，或含 `..` 段，一律拒绝。
- 另读固定路径 `docs/sam/audit/hydro_inventory.json` 作为 legacy 清点。

### 3.2 启用后的加载

1. 脚本加载时（同步）检查 `window.HistoricalAtlasController.prototype` 上 `_hydroMask` 与 `_buildTerrainRivers` 都是函数；任一不存在 ⇒ 配置错误"与当前上游版本不兼容"，不包装。
2. 同步包装两个方法（此时数据未就绪，包装后的方法行为与原方法**完全一致**）。
3. fetch 三个文件 → 用 `SamResearchContract.validateDataset` 校验 → 有任何 error ⇒ 配置错误，**不渲染任何研究要素、不压任何旧条目**。
4. **旧条目漂移检查**：对数据集中出现的每个 `supersedes` id，按清点里的 `kind` 与 `index` 找到当前 `window.HYDRO_DATA` 中的条目，核对 `name`（label 用 `zh`）、`rank`、`appear`、`vanish`（`undefined` 视为 `null`）与几何点数是否与清点一致；任一不一致 ⇒ 配置错误"上游水系数据已变动，替代关系需重核"，不渲染。
5. 全部通过 ⇒ 标记就绪，并对当前控制器实例（`window.atlasApp`；若此时还未实例化，则等实例化后）调用一次包装后的 `_buildTerrainRivers()` 与原有的 `_rescaleSvgTypography()`（若存在）。

### 3.3 包装后的 `_hydroMask(year)`

返回 `原结果 + '|' + 研究掩码`。研究掩码＝`dataset_revision` ＋ 该年可见研究要素 id（排序）＋ 被压的旧条目 legacy_id（排序）＋ 图层是否被用户关闭。未就绪或出错时研究掩码为空串，返回值与原方法完全相同。

### 3.4 包装后的 `_buildTerrainRivers()`

1. 计算本年**可见研究要素**：`valid` 半开区间 `[from, to)`；`from_status`/`to_status` 为 `open` 的一端视为无限；为 `unknown` 的一端视为**不可见**（不确定的不显示，并计入横幅的"年代未知"计数）。`review_state` 为 `rejected` 或 `superseded` 的不显示。
2. 计算**被压的旧条目**＝本年可见研究要素的 `supersedes` 并集（图层被用户关闭时为空集）。
3. 临时把 `this.hydroData` 换成去掉被压条目后的浅拷贝，调用原方法，再还原 `this.hydroData`，**然后用未过滤的数据重设 `this.activeHydroMask = this._hydroMask(this.year)`**（否则每次年份变化都会误判需要重绘）。
4. 在 `#grp-rivers` 之后插入（若不存在）`<g id="grp-sam-research">`，清空后绘制本年可见研究要素：线要素与多边形分别用不同 class；按 `evidence_mode` 区分样式（`attested` 实线、`reconstructed` 长虚线、`schematic` 点线、`hypothesis` 细点线加低透明度）；每个 path 带 `data-feature-id`，并带 `<title>`：id、`valid` 区间（写明半开）、`evidence_mode`、`review_state`、每条 claim 的来源 title 与 `locator`。投影用控制器已有的 `this.projector.toScreen(lon, lat)`。
5. 研究要素不画文字标签（v0 不做）。

### 3.5 横幅（研究图层状态）

启用时在页面角落插入一个小面板（样式由脚本注入 `<style>`，不改 css 文件），显示：

- `dataset_id`、`dataset_revision`、`stage`；`meta.synthetic === true` 时显示醒目的 **SYNTHETIC / 非史料** 标记；
- 当前年份、可见研究要素数、被压旧条目数、年代未知而未显示的要素数；
- 本年没有任何可见研究要素时显示"本年无研究数据"（这是 v0 的缺测提示）；
- 一个"显示研究图层"复选框：取消勾选 ⇒ 研究要素隐藏、被压旧条目恢复，并触发一次重绘；
- 出错时：显示"研究图层未启用"＋错误类别＋前 5 条错误码与 path（完整列表打印到 `console.error`）。

### 3.6 纯函数（`research_layer_core.js`，供测试）

至少导出：`parseResearchParams(search)`、`isFeatureVisible(feature, year)`、`computeVisible(dataset, year)`、`computeSuppressed(visibleFeatures, enabled)`、`checkLegacyDrift(inventory, hydroData, ids)`、`researchMask(dataset, year, enabled)`、`featurePathData(geometry, toScreen)`。浏览器胶水层必须调用这些函数，不得在胶水层里另写一份同样的逻辑。

## 4. 测试（`node scripts/sam/research_layer_core.test.js`，`node:assert`）

至少，每条都要能失败：

1. 参数解析：两个都无 ⇒ 未启用；只有一个 ⇒ 错误；`https://…`、`/abs`、`a/../b`、`//x` ⇒ 错误；合法相对路径 ⇒ 通过。
2. 半开区间：`[1938,1947)` 在 1937 不可见、1938 可见、1946 可见、1947 不可见；`to_status: open` 时 3000 年可见；`from_status: unknown` 时任何年份都不可见。
3. 替代：研究要素不可见的年份，其 `supersedes` 不进入被压集合；关闭图层时被压集合为空。
4. 漂移：把内存中某条 `HYDRO_DATA` 河的 `vanish` 改掉 ⇒ `checkLegacyDrift` 报错并点名该 legacy_id；不改 ⇒ 无错。
5. 掩码：只改 `dataset_revision` ⇒ 掩码改变；跨过要素边界年 ⇒ 掩码改变；同一区间内两个年份 ⇒ 掩码相同。
6. `featurePathData`：给定恒等投影，LineString 与带洞 Polygon 输出预期的 path 字符串。
7. 用真实的 `js/china_geo_data.js`（vm 加载）与 `docs/sam/audit/hydro_inventory.json` 跑 §5 演示数据的漂移检查 ⇒ 无错（证明演示数据引用的 legacy_id 与当前上游一致）。
8. `node scripts/sam/validate_research.test.js` 与 `node scripts/sam/hydro_inventory.test.js` 仍通过。

## 5. 演示数据（`scripts/sam/fixtures/research_demo/`）

- `demo_synthetic.geojson`＋`demo_sources.json`：`stage: draft`、`synthetic: true`，必须通过 `validate_research.js`（附命令输出）。
- 一条 LineString，`valid` 为 `[1938, 1947)`，`evidence_mode: hypothesis`，`supersedes` 指向清点中 `name` 为 `Huang`、`appear` 为 1855、`vanish` 为 null 的那条（在报告里写出它的 legacy_id）。
- **几何必须一眼看出是人造的**（如规则的锯齿或方波折线），落在华北平原范围内以便看见，**不得描摹或近似任何真实河道**；`description` 写明 "synthetic demo geometry for layer mechanics, not historical"。
- 再加一条 `to_status: unknown` 的要素（验证"年代未知不显示"）和一条 `geometry: null` 的要素。

## 6. 验证与报告（`docs/sam/audit/P0a-3_REPORT.md`）

三段式，附真实输出：

1. §4 全部测试输出；
2. `git diff -- index.html` 全文（`scripts/sam/research_contract.js` 不在白名单，已由 P0a-2b 提供浏览器导出 `globalThis.SamResearchContract`，只读使用）；
3. 演示数据过 `validate_research.js` 的输出；
4. `node scripts/validate_atlas.js`：若你的环境等不到它结束，如实写"未能完成"，不要声称通过（主会话会补跑）；
5. 浏览器内行为（年份切换、复选框、横幅）你的环境无法验证 ⇒ 写明"待主会话浏览器终验"，并列出你建议主会话检查的 URL 与预期现象；
6. 「本单里的数与你实测有出入吗？」；
7. 你认为本设计有缺陷的地方（如包装方式在某种调用顺序下失效）——给出具体调用顺序，不要擅自换方案；
8. 最后一行：`P0a-3 DONE`。
