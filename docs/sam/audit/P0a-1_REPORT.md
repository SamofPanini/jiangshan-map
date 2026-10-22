# P0a-1 执行报告

## 交付物清单

- `scripts/sam/hydro_inventory.js`：只使用 Node 内置模块的 fail-closed 清点器；显式要求 `--geo`、`--map`、`--out-dir`、`--margin-deg`，以 `vm` 读取数据，并生成稳定 `legacy_id`、交通线清单、跨层探针和人读摘要。
- `scripts/sam/hydro_inventory.test.js`：七项可失败断言，覆盖缺参、未知参数、缺失 `HYDRO_DATA` 时零产物、确定性、坐标改变的指纹隔离、数组中插入项后的 ID 稳定性，以及半开/闭区间端点语义。
- `docs/sam/audit/hydro_inventory.json`：290 个水系条目及静态 kind × rank 汇总。
- `docs/sam/audit/corridor_inventory.json`：16 条交通线的闭区间、bbox、指纹和原始字段名。
- `docs/sam/audit/coherence_probe.json`：33 个边界年、16 条交通线各自的水系端点组合（合计 30 个）、12 条 timed label 的机械配对和黄河同期并存集。
- `docs/sam/audit/P0a-1_INVENTORY.md`：28 条 timed 条目、静态汇总、16 条交通线、探针计数及区间语义的人读摘要。
- `docs/sam/audit/P0a-1_REPORT.md`：本报告。

## 验证结果（逐项）

1. 生成命令（exit 0）：

   ```text
   node scripts/sam/hydro_inventory.js --geo js/china_geo_data.js --map js/map_data.js --out-dir docs/sam/audit --margin-deg 0.5
   READ geo=js/china_geo_data.js sha256=fbf152b521745917aff59c4d61c4f7e6ef8b80402125977c6023799844476de4 map=js/map_data.js sha256=8fd8cb0fabb6bd201b535867307c3f49a287fb4b1e26393fdf9b8f181fee3684 rivers=187 lakes=62 labels=41 corridors=16
   ```

   产物 `meta.git_head` 实测为 `46230baf5d47ac8e77afaf6a94449adc698445c7`。

2. 测试命令（exit 0）：

   ```text
   node scripts/sam/hydro_inventory.test.js
   hydro_inventory.test.js: 7 required cases passed
   ```

3. 上游回归（exit 0）：

   ```text
   node scripts/validate_atlas.js
   ✓ Jiangshan Atlas validation passed in 52533.8 ms:
     - 18 dynasties, 167 snapshots (165 phase-linked), 2430 timeline years swept
     - 15204 historical polygons (2,421,917 vertices) verified lossless & collision-free
     - 35 modern provinces (314 rings)
     - 1387 ancient settlements & 442 historical milestones
     - 7 journeys (68 bilingual stops), 351 era spans, 571 landmark events & 185 gazetteer landmarks verified across 27 E2E CUJs
   ```

4. 实测读数逐项对照：

   | 项目 | 派发方读数 | 实测 | 结果 |
   |---|---:|---:|---|
   | `HYDRO_DATA` rivers / lakes / labels | 187 / 62 / 41 | 187 / 62 / 41 | 一致 |
   | 带 `appear` 或 `vanish` 的河 / 湖 / 标签 | 11 / 5 / 12 | 11 / 5 / 12 | 一致 |
   | `CORRIDOR_DATA` 总数及 wall / road / canal / sea | 16；6 / 4 / 4 / 2 | 16；6 / 4 / 4 / 2 | 一致 |
   | 水系可见性 | 半开 `[appear, vanish)` | 半开 `[appear, vanish)` | 一致 |
   | 交通线可见性 | 闭区间 `[span[0], span[1]]` | 闭区间 `[span[0], span[1]]` | 一致 |

   「本单里的数与你实测有出入吗？」没有；以上每一项均一致。

5. `git status --porcelain --untracked-files=all`（本报告写入后；仅使用获准的 `git status`）输出：

   ```text
    M docs/sam/HISTORICAL_GIS_EXTENSION_PLAN.md
    M docs/sam/UPSTREAM_TRACKING.md
   ?? AGENTS.md
   ?? docs/sam/ROADMAP.md
   ?? docs/sam/audit/P0a-1_INVENTORY.md
   ?? docs/sam/audit/P0a-1_REPORT.md
   ?? docs/sam/audit/coherence_probe.json
   ?? docs/sam/audit/corridor_inventory.json
   ?? docs/sam/audit/hydro_inventory.json
   ?? docs/sam/tasks/P0a-1_hydro_inventory_TASK.md
   ?? scripts/sam/hydro_inventory.js
   ?? scripts/sam/hydro_inventory.test.js
   ```

   本次新增的 7 个文件均在白名单内。`docs/sam/HISTORICAL_GIS_EXTENSION_PLAN.md`、`docs/sam/UPSTREAM_TRACKING.md`、`AGENTS.md`、`docs/sam/ROADMAP.md` 和任务单是工作区既有/主会话文件；本次未读取或改写前两项，也未改写其余三项。

6. 可复用的操作教训：含有 `undefined` 的数据结构须用 `!== undefined` 判断时间字段；`in` 会把构造阶段始终存在的键误报为带年代。把源文件放进最小 `vm` 沙箱后再做结构校验，可使错误输入在创建输出目录之前终止。

## 规格偏差

无。

建议区：fp 依任务单严格采用字段顺序固定的 `JSON.stringify` 与原始数值坐标；未自行替换为其他规范化算法。标签与几何候选也只使用任务单规则 A（共享英文 token）和规则 B（label 坐标落入 bbox），没有作名称或史实推断。

P0a-1 DONE
