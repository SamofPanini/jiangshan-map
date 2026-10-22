# 任务单 P0a-1｜水系与交通线只读清点、稳定 ID、跨层一致性探针

- task_id：`jsm-p0a1-inventory`
- 派发方：Sam's Agent(Opus-5.5)（Claude Code 主会话）；执行：Codex GPT-5.6 Terra
- 建立：2026-10-23；状态：active
- 路线图位置：`docs/sam/ROADMAP.md` 的 P0a-1（该文件可能正在被主会话编辑，**只读，不要改**）

## 0. 开工前必读

1. 仓库根 `AGENTS.md`（本 fork 的项目规则，尤其 §2 文件边界、§3 fail-closed 器械纪律）。
2. 本单全文。读长文件时用行号区间或 `grep -n` 定位，**不要把整份大文件读进上下文**（`js/*.js` 单个可达 0.4–1.6MB）。
3. 不要运行任何全盘扫描命令；本仓库内 `git status --porcelain` 允许。
4. 本次派发在 vault 外运行，vault 的租约/冻结 guard **不在场**；写入范围完全靠本单白名单自律。

## 1. 目的（为什么要做）

后续要在原地图上叠加"研究图层"（例如 1938–1947 黄河），需要能声明"这一条研究要素**替代**了哪几条旧条目"。但旧水系条目没有 ID：`HYDRO_DATA.rivers` 里有 10 条都叫 `Huang`，`app.js` 的 `_hydroMask` 又按**数组位置**拼接。所以第一步是：**给每条旧条目一个按内容生成、不随数组位置漂移的稳定 ID**，并把带年代的条目、交通线、两者的时间关系清点出来。**本单只读，不改任何上游文件，不做任何史学判断。**

## 2. 派发方读数（你实测有出入就报，不要去凑）

以本 fork main `46230ba`（上游代码与 `a9cd67c` 相同）为对象：

| 量 | 派发方读数 | 出处 |
|---|---|---|
| `HYDRO_DATA` rivers / lakes / labels | 187 / 62 / 41 | `js/china_geo_data.js` 末尾 `window.HYDRO_DATA = {...}` |
| 其中带 `appear` 或 `vanish` 的条目 | 河 11 / 湖 5 / 标签 12（合计 28） | 同上 |
| `CORRIDOR_DATA` 条目 | 16（wall 6 / road 4 / canal 4 / sea 2） | `js/map_data.js:18532` |
| 水系可见性语义 | 半开区间 `[appear, vanish)`；缺省端视为开放 | `js/app.js:1119-1125` `_isHydroVisible` |
| 交通线可见性语义 | **闭区间** `[span[0], span[1]]`；`9999` 疑为"至今"哨兵 | `js/app.js:1906`、`:1914`、`:2550` |

注意：`HYDRO_DATA` 的构造是 `appear: r.a`，缺省时**键存在但值为 `undefined`**；判断"是否带年代"要按 `!== undefined`，不能按 `in`。

## 3. 交付物（白名单）

只允许新建以下路径；其他任何文件不得改动：

- `scripts/sam/hydro_inventory.js`
- `scripts/sam/hydro_inventory.test.js`
- `docs/sam/audit/hydro_inventory.json`
- `docs/sam/audit/corridor_inventory.json`
- `docs/sam/audit/coherence_probe.json`
- `docs/sam/audit/P0a-1_INVENTORY.md`（人读摘要）
- `docs/sam/audit/P0a-1_REPORT.md`（三段式执行报告）

### 3.1 `scripts/sam/hydro_inventory.js`（Node，只用内置模块）

- 用法：`node scripts/sam/hydro_inventory.js --geo <china_geo_data.js> --map <map_data.js> --out-dir <dir> --margin-deg <数>`
  - 四个参数全部必填，**无默认值**；缺任一、出现未知参数、参数值不合法 ⇒ 打印原因并 `exit 2`。
  - 用 `vm` 沙箱加载数据文件（参考 `scripts/validate_atlas.js` 的加载方式）；`window.HYDRO_DATA` 或 `window.CORRIDOR_DATA` 不存在或不是预期形状 ⇒ 抛错退出，**不得退化成空集合**。
- 开口自报一行：两个输入文件的路径、sha256、各集合条数。这一行也写进每个 JSON 产物的 `meta`（另加 `generated_by`、`git_head`——`git_head` 拿不到就写 `null` 并说明，不要编）。
- 输出必须**确定性**：同一输入跑两次，产物逐字节相同（不写当前时间戳；键顺序与数组顺序固定）。

### 3.2 稳定 ID（`hydro_inventory.json`）

对 rivers / lakes / labels 每一条输出：

- `kind`（river / lake / label）、`index`（原数组下标，仅作对照，**不是 ID**）、`name`（label 用 `zh` 与 `en`）、`rank`、`appear`、`vanish`（缺省输出 `null`）、`timed`（布尔）、几何统计（线/环数、点数、bbox `[minLon,minLat,maxLon,maxLat]`；label 输出 `coord`）。
- `fp`：对 `{kind, name/zh, rank, appear, vanish, 全部坐标}` 做规范化 JSON 后取 sha256，截前 12 位十六进制。坐标按原值序列化，不取整。
- `legacy_id`：`<kind>:<name 或 zh>:<fp>`。
- **断言 `legacy_id` 全局唯一**。若有重复：不去重、不改算法凑唯一，把重复组完整列出并在报告里写明。
- 另输出静态条目（非 timed）的类级汇总：按 kind × rank 计数。

### 3.3 交通线（`corridor_inventory.json`）

每条：`key`、`kind`、`title`、`span`、`span_semantics: "closed"`、`open_end`（`span[1] === 9999` 时为 true）、段数、点数、bbox、`fp`（同 3.2 规则）、以及该条目上出现的全部字段名（用于后续映射到"路段"对象时知道有哪些字段）。

### 3.4 跨层一致性探针（`coherence_probe.json`）

**只列事实，不下结论**——不判断哪一方的年份对。三部分：

1. **边界年清单**：水系所有 `appear`/`vanish` 与交通线所有 `span` 端点，去重排序；每个年份注明来自哪些 `legacy_id`/`key`，以及该端点是半开还是闭区间端点。
2. **时段内发生边界的组合**：对每条交通线（全部 16 条），找出满足以下两条的水系条目：
   - bbox 相交（交通线 bbox 向四周外扩 `--margin-deg` 度后判断）；
   - 该水系条目的 `appear` 或 `vanish` 落在交通线 `span` 内（按各自的区间语义判断，写明用了哪条规则）。
   每个组合输出：交通线 key、水系 legacy_id、哪一个端点落入、该年份。
3. **标签与几何的区间不对齐**：对每条 timed label，列出同名或同一水体的几何条目候选，以及两者区间是否完全相同。"同一水体"不要自己判断——只按以下**可机械复核**的规则配对，并在输出里写明配对依据：
   - 规则 A：label 的 `en` 与几何 `name` 有共同的单词 token（不区分大小写）；
   - 规则 B：label 的 `coord` 落在几何条目的 bbox 内。
   两条规则都配不上的 label 单列为 `unpaired`，**不要猜**。
4. **同期并存集**：在每个边界年 `y` 以及 `y-1`，列出 `name === "Huang"` 的所有可见条目（按 `_isHydroVisible` 的规则）。这是为"研究层替代旧条目"做设计输入。

### 3.5 `P0a-1_INVENTORY.md`

人读摘要：28 条 timed 条目一张表（legacy_id、名称、rank、区间、几何统计）；静态条目类级汇总；16 条交通线一张表；探针三部分各自的计数与前 N 条（N 自定，但**表里不得截断 legacy_id**）；区间语义差异（水系半开 vs 交通线闭区间）单列一节。

### 3.6 `scripts/sam/hydro_inventory.test.js`（`node scripts/sam/hydro_inventory.test.js` 运行，用 `node:assert`）

至少包含以下用例，每条都必须是**能失败的**断言：

1. 缺少任一必填参数 ⇒ 非零退出；
2. 出现未知参数 ⇒ 非零退出；
3. 输入文件里没有 `HYDRO_DATA`（用临时文件构造）⇒ 非零退出，且没有写出任何产物；
4. 同一输入跑两次 ⇒ 产物逐字节相同；
5. 只改动一条河的一个坐标（在内存或临时副本里）⇒ 该条 `fp` 改变，其他条目 `fp` 不变；
6. 在数组中间插入一条新河 ⇒ 原有条目的 `legacy_id` 全部不变（这正是不用下标当 ID 的理由）；
7. 区间语义：用构造数据验证半开 / 闭区间判断在端点上的结果（如 `vanish=1194` 时 1194 年不可见；`span=[605,1292]` 时 1292 年可见）。

临时文件放在系统临时目录并在测试结束时删除，不要写进仓库。

## 4. 验证（报告里逐项附真实输出）

1. `node scripts/sam/hydro_inventory.js --geo js/china_geo_data.js --map js/map_data.js --out-dir docs/sam/audit --margin-deg 0.5` 的自报行与退出码。
2. `node scripts/sam/hydro_inventory.test.js` 全部通过的输出。
3. `node scripts/validate_atlas.js` 仍 exit 0（只要末尾几行）。
4. `git status --porcelain` 只出现白名单内的新文件（以及主会话可能在 `docs/sam/` 下正在编辑的 `ROADMAP.md`、`AGENTS.md`、`tasks/`——这些不是你的改动，照实列出即可，不要动它们）。
5. 第 2 节表格逐行对照你的实测值。

## 5. 停机条件

- 数据结构与本单描述不符（如 `HYDRO_DATA` 不在 `window` 上、`CORRIDOR_DATA` 字段不同），且无法用保守方式处理 ⇒ 停下，写报告说明，不自行改设计。
- 需要修改白名单外文件才能完成 ⇒ 停下报告。
- 需要安装任何依赖 ⇒ 停下报告。

## 6. 报告（`docs/sam/audit/P0a-1_REPORT.md`）

三段式：交付物清单 / 验证结果（逐项，附命令与输出）/ 规格偏差（无则写「无」）。另附：

- 「本单里的数与你实测有出入吗？」逐项回答。
- 方法差异：如果你认为本单某处设计有更好的做法（如 fp 的规范化方式、配对规则），写在建议区，**不要擅自改用**。
- 可复用的操作教训（换个任务也会踩的）单列一小节。
- 报告最后一行写：`P0a-1 DONE`。
