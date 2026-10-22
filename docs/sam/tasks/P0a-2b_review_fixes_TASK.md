# 任务单 P0a-2b｜按 R1 审核处置修复（含契约的浏览器导出）

- task_id：`jsm-p0a2b-fixes`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：active

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. `docs/sam/audit/R1_REVIEW.md` 全文，**尤其末尾"我方逐条处置"表——那是本单的权威范围**。
3. 本单全文。
4. 不运行 `git status` / `git diff` 以外的全库扫描；不 commit；读大文件用行号区间。vault 外运行，vault guard 不在场。

## 1. 白名单

- `scripts/sam/hydro_inventory.js`、`scripts/sam/hydro_inventory.test.js`
- `scripts/sam/research_contract.js`、`scripts/sam/validate_research.js`、`scripts/sam/validate_research.test.js`
- `scripts/sam/fixtures/contract/legacy_inventory_min.json`
- `docs/sam/CONTRACT.md`
- `docs/sam/audit/hydro_inventory.json`、`corridor_inventory.json`、`coherence_probe.json`、`P0a-1_INVENTORY.md`（只能通过重跑生成器改动）
- `docs/sam/audit/P0a-2b_REPORT.md`（新建）

## 2. 要做的修复（逐条对应 R1 编号）

1. **R1-01**：`validateDataset` 收到不符合 P0a-1 形状的 `legacyInventory`（不是对象、没有 `entries` 数组、entry 缺 `legacy_id`）时**抛出 `TypeError`**，不得当成零条。CLI 的行为保持 exit 2。补测试：直接调用纯函数传 `{bad:true}` 且数据无 `supersedes` ⇒ 抛错。
2. **R1-02**：
   - `hydro_inventory.js` 的 meta **删除 `git_head`**，改为 `generator: { path, sha256 }`（生成器脚本自身文件的 sha256）。
   - 删除"从既有产物继承 provenance"的整段逻辑，包括其中的空 `catch`。生成器**不得读取输出目录里的既有产物**。
   - 产物于是成为（输入文件 ＋ 生成器脚本）的纯函数。重跑后 `hydro_inventory.json` 的 `meta` 会变，**`entries` 必须与 HEAD 版本逐值相同**（写脚本比对 `entries` 与全部 `legacy_id`，附输出）；`corridor_inventory.json` 同理比对其条目数组。
   - 补测试：输出目录里预放一份伪造 meta 的旧产物 ⇒ 新产物的 meta 与伪造值无关。
3. **R1-03**：release 校验对已判为类型错误的 claim（非对象、`supports` 非数组）跳过，不得抛未捕获异常。补测试：`stage: release`、`synthetic: false`、`claims: [null]` ⇒ 返回结构化 errors（含 `E_TYPE`），不抛异常。
4. **R1-04**：规则 A 去掉**所有**括号段（`(...)` 与全角 `（...）`），保留括号后的正文。补测试：`"Alpha (old name) Beta"` 能用 `Beta` 配上名为 `Beta` 的几何。重跑后若 12 条 timed label 的配对结果有变化，在报告里逐条列出。
5. **R1-05**：导出 `STAGES`、`INTERVALS`、`ENDPOINT_STATUSES`，函数内改为引用这些常量。文档一致性测试改为：`CONTRACT.md` 中列出的每个枚举值集合 == 模块导出的对应集合（包括这三个与原有各枚举），错误码集合同理。
6. **R1-06**：`legacy_inventory_min.json` 的 `meta` 用脚本从（重新生成后的）`docs/sam/audit/hydro_inventory.json` 复制，不手打。测试改为核对 mini 清点的 `meta.inputs` 与每条 entry 都与真实清点逐值相同。
7. **R1-07**：不加任何新字段。在 `CONTRACT.md` 写明三条裁定：Feature `id` 即 `geometry_id`；缺测四态属于覆盖层（数据集级），`geometry_absent_reason` 保持三值；派生方法与审核记录推迟到 v0.2（触发：P0b 第一条真实几何）。
8. **R1-08**：在 `CONTRACT.md` 增"错误优先级"一节：坐标不是有限数或超出 WGS84 范围时报 `E_COORD`，并**跳过**该坐标的区域 bbox 检查。补测试已存在则保留。
9. **浏览器导出（为 P0a-3 准备）**：`research_contract.js` 末尾改为同时支持 Node（`module.exports`）与浏览器（`globalThis.SamResearchContract`）。校验规则不得因此改变。补测试：用 `vm` 在没有 `module` 的沙箱里执行该文件 ⇒ `SamResearchContract.validateDataset` 可用，且对 `valid_draft.geojson` 结果与 Node 下相同。

## 3. 验证（报告里逐项附输出）

1. 三套测试全部通过：`hydro_inventory.test.js`、`validate_research.test.js`。
2. R1_REVIEW 中 R1-01 至 R1-06 的**原反例逐条重跑**，附修复后的输出。
3. §2 第 2 条的 `entries` 比对输出。
4. `node scripts/validate_atlas.js`：等不到结束就如实写"未能完成"，不要声称通过。
5. 「本单里的数与你实测有出入吗？」
6. 最后一行：`P0a-2b DONE`。
