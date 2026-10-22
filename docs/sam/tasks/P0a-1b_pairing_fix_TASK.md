# 任务单 P0a-1b｜修正标签—几何配对规则（派发方规格缺陷修复）

- task_id：`jsm-p0a1b-pairing`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：active
- 前序：`docs/sam/tasks/P0a-1_hydro_inventory_TASK.md`（已验收）；本单只改其 §3.4 第 3 部分与边界年的哨兵标注

## 0. 开工前必读

1. 仓库根 `AGENTS.md`。
2. 本单全文，以及前序任务单 §3.4。
3. 读源码用行号区间或 `grep -n` 定位，不要把整份大文件读进上下文。不运行 `git status` 以外的全库扫描；不 commit。
4. 本次在 vault 外运行，vault guard 不在场。**另有一个执行者同时在本仓库做 P0a-2**（新建 `scripts/sam/research_contract.js`、`scripts/sam/validate_research*.js`、`scripts/sam/fixtures/contract/`、`docs/sam/CONTRACT.md`、`docs/sam/audit/P0a-2_REPORT.md`）——这些不是你的文件，不要读改，`git status` 里看到照实列出即可。

## 1. 为什么改（派发方的缺陷，不是你上一轮的）

上一轮的配对规则是我写的，验收时发现两处问题：

- **规则 B 用 bbox 太宽**：黄河上游几段不带年代的长河段 bbox 覆盖整个华北，几乎每条标签都被配上。
- **规则 A 没过滤无意义 token**：`Hongze L.` 的 `l` 配上了 `Khövsgöl Nuur`；而真正该配的 `Yellow R.` ↔ `Huang` 因为一个是英文一个是拼音，规则 A 永远配不上。

## 2. 新规则（替换前序单 §3.4 第 3 部分）

对每条 timed label，对每条 river / lake 几何条目（**含不带年代的**）逐条判断以下规则；满足任一条即列为候选，`pairing_basis` 列出满足的全部规则：

- **规则 A（名称 token）**：只取 label `en` **括号外**的文本与几何 `name` 做 token 比较（小写，按非字母数字切分）。丢弃长度 ≤ 1 的 token 和停用词 `{"r","l","river","lake","marsh","course","n","s","e","w"}`。共享至少一个 token 即满足。
- **规则 A2（固定译名表）**：脚本里写死一张表，当前只有一项 `{"yellow": "huang"}`：label 括号外 token 含 `yellow` 且几何 `name` 的 token 含 `huang` 即满足。表要有注释说明"只收录在本数据中可逐字核对的英文名↔拼音名对应；新增须经任务单"。
- **规则 B（距离）**：label `coord` 到几何的**平面最短距离**（经纬度直接当平面坐标；LineString 用点到线段距离、Polygon 用点到环边距离，点在多边形内部时距离为 0）≤ `--margin-deg`。输出实际距离（保留 4 位小数）。在 `P0a-1_INVENTORY.md` 写明这是度数平面近似，不是测地距离。
- **规则 C（区间完全相同）**：label 与几何的 `appear`、`vanish` 均相等（`null` 与 `null` 视为相等），**且同时满足规则 B**。只满足区间相同而不满足 B 的不算。

两条以上规则都不满足的 label 单列 `unpaired`，不要猜。

另：边界年清单里，`9999` 不是年份而是"至今"哨兵。保留该条，但加字段 `is_sentinel: true` 和 `meaning: "open_end"`；其他年份 `is_sentinel: false`。

## 3. 白名单

只允许修改：

- `scripts/sam/hydro_inventory.js`
- `scripts/sam/hydro_inventory.test.js`
- `docs/sam/audit/coherence_probe.json`（重新生成）
- `docs/sam/audit/P0a-1_INVENTORY.md`（重新生成）
- `docs/sam/audit/P0a-1b_REPORT.md`（新建）

## 4. 不变量（必须机械验证并在报告里附输出）

1. 重新生成后，`docs/sam/audit/hydro_inventory.json` 与 `docs/sam/audit/corridor_inventory.json` **与 git HEAD 版本逐字节相同**（用 `git diff --exit-code -- <这两个文件>` 证明）。`legacy_id` 一个都不能变。
2. `coherence_probe.json` 中除 `boundary_years`（只新增两个字段）与配对两节外，其余键的内容与 HEAD 版本相同（写一段小脚本比对并附输出）。
3. 前序 7 项测试仍全部通过；新增至少以下 5 项能失败的测试：
   - `Hongze L.` 这类单字母 token 不触发规则 A；
   - `Yellow R.` 经规则 A2 与名为 `Huang` 的几何配上；
   - 构造一条 L 形折线：label 落在其 bbox 内但到折线距离大于 margin ⇒ 规则 B 不满足；
   - 区间相同但距离超出 margin ⇒ 规则 C 不满足；
   - `9999` 的边界年条目 `is_sentinel === true`。
4. `node scripts/validate_atlas.js` 仍 exit 0。

## 5. 报告（`docs/sam/audit/P0a-1b_REPORT.md`）

三段式：交付物清单 / 验证结果（逐项，附命令与输出）/ 规格偏差。另附：

- 12 条 timed label 各自的新候选（legacy_id、满足的规则、距离），以及 `unpaired` 列表——**全部列出，不截断**。
- 配对结果里有没有你认为仍然明显不对的（例如两条规则都满足却显然不是同一水体）？只描述现象和依据，**不要为此再改规则**。
- 最后一行：`P0a-1b DONE`。
