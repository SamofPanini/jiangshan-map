# P0a-2 执行报告

## 交付物清单

- 新建 `scripts/sam/research_contract.js`：v0.1.0 唯一机读正典，导出版本、区域表、枚举与无 I/O 的 `validateDataset`。严格键、JSON Pointer 错误排序、坐标/线环、来源/legacy 引用、release 门槛均在此实现。
- 新建 `scripts/sam/validate_research.js`：三个显式必填输入；未知参数、重复参数、读取/JSON/legacy 格式错误 exit 2；有契约错误 exit 1；成功 exit 0。首行输出三个路径、完整 SHA-256、计数、stage 与 synthetic。
- 新建 `scripts/sam/fixtures/contract/`：`valid_draft.geojson`（LineString、含洞 Polygon、null geometry），`sources.json`，以及从 P0a-1 原样摘录 meta 和三条 timed `Huang` entry 的 `legacy_inventory_min.json`。另有 21 个 `invalid_e_*.geojson`，每个只触发其文件名对应的一个错误码集合。
- 新建 `scripts/sam/validate_research.test.js`：覆盖有效样例、所有 21 个无多报/少报反例、真实 P0a-1 inventory、CLI fail-closed、stdout 确定性、纯函数越界坐标负例和说明文档错误码同构检查。
- 新建 `docs/sam/CONTRACT.md`：字段/枚举/错误码表、半开区间及旧交通闭区间换算、四项证据维度分离理由，以及延后对象及触发条件。

## 验证结果（逐项）

1. 语法检查（exit 0；无 stdout）：

```text
node --check scripts/sam/research_contract.js
node --check scripts/sam/validate_research.js
node --check scripts/sam/validate_research.test.js
```

2. `node scripts/sam/validate_research.test.js`（exit 0）：

```text
PASS valid + 21 invalid fixtures + CLI fail-closed + determinism + direct API + documentation error-code parity
```

3. 有效样例（exit 0，完整输出）：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/valid_draft.geojson sha256=b752c2d51bb1277e5eac8087e19b185a05925c9fb84075c15e78324c07c1bc2d features=3 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/sources.json sha256=f12600df1cf320de86cb3b6bc6ed62e78ed19d0f9d2bf443af22f68b6ff92d9f source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/legacy_inventory_min.json sha256=38e6d6901c9cc3e4923753a56a30b48f301b16658885ab5c202bf2cc8b581a9b legacy_count=3 stage=draft synthetic=true
```

4. 两个无效样例（各 exit 1；完整输出）：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/invalid_e_coord.geojson sha256=e4d236a90425598eb5bac3150b8c940b02fd55cdae619190e8b0083047195052 features=1 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/sources.json sha256=f12600df1cf320de86cb3b6bc6ed62e78ed19d0f9d2bf443af22f68b6ff92d9f source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/legacy_inventory_min.json sha256=38e6d6901c9cc3e4923753a56a30b48f301b16658885ab5c202bf2cc8b581a9b legacy_count=3 stage=draft synthetic=true
ERROR E_COORD /features/0/geometry/coordinates/0 coordinate is outside WGS84 bounds
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/invalid_e_release.geojson sha256=e9a6ed05780c5ad9225841e329d4358ab09a70480bee0a8446c8c8bea7c27f0d features=1 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/sources.json sha256=f12600df1cf320de86cb3b6bc6ed62e78ed19d0f9d2bf443af22f68b6ff92d9f source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/contract/legacy_inventory_min.json sha256=38e6d6901c9cc3e4923753a56a30b48f301b16658885ab5c202bf2cc8b581a9b legacy_count=3 stage=release synthetic=true
ERROR E_RELEASE /features/0/properties/review_state release feature must be accepted
ERROR E_RELEASE /meta/synthetic release dataset must be non-synthetic
ERROR E_RELEASE /sources/0 release-referenced source must be cleared and non-synthetic
```

5. 上游回归 `node scripts/validate_atlas.js`（exit 0，57254.6 ms）：

```text
✓ Jiangshan Atlas validation passed in 57254.6 ms:
  - 18 dynasties, 167 snapshots (165 phase-linked), 2430 timeline years swept
  - 15204 historical polygons (2,421,917 vertices) verified lossless & collision-free
  - 35 modern provinces (314 rings)
  - 1387 ancient settlements & 442 historical milestones
  - 7 journeys (68 bilingual stops), 351 era spans, 571 landmark events & 185 gazetteer landmarks verified across 27 E2E CUJs
```

6. `git status --porcelain`（本报告写入后实测；只做状态读取，不改并行 P0a-1b 文件）：

```text
 M docs/sam/audit/P0a-1_INVENTORY.md
 M docs/sam/audit/coherence_probe.json
 M scripts/sam/hydro_inventory.js
 M scripts/sam/hydro_inventory.test.js
?? docs/sam/CONTRACT.md
?? docs/sam/audit/P0a-1b_REPORT.md
?? docs/sam/audit/P0a-2_REPORT.md
?? docs/sam/tasks/R1_review_P0a-1b_P0a-2_TASK.md
?? scripts/sam/fixtures/
?? scripts/sam/research_contract.js
?? scripts/sam/validate_research.js
?? scripts/sam/validate_research.test.js
```

7. task-closeout：启动时 debt registry 不存在，按技能要求视为未知；本任务单并未在白名单中，故未改其 `status: active`。报告写入后只读 `check` 的 exit 1 完整输出如下；此限制不影响本单白名单交付物和验证，但任务单状态的正式关闭需具备任务单写入授权。

```json
{
  "task": "/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/tasks/P0a-2_contract_validator_TASK.md",
  "exists": true,
  "status_values": [],
  "status_done": false,
  "report_found": false,
  "report_terms": {},
  "readbacks": [],
  "readback_ok": true,
  "ok": false
}
```

8. 「本单里的数与你实测有出入吗？」无。实测为 21 个错误码、21 个无效样例、3 个有效样例 feature、1 个来源、3 条 legacy entry；与任务单要求一致。

## 规格偏差

- 无实施偏差：未触碰 `app.js`、上游数据或并行 P0a-1b 指定文件，未安装依赖、未提交。
- 需裁定的契约矛盾：ROADMAP §4 的对象 ID 链含 `geometry_id`，而本任务单 §3.1 的 Feature properties 未列该键，同时 §4 又要求未列键报 `E_UNKNOWN_KEY`。反例：若输入严格按 ROADMAP 添加 `geometry_id: "g-1"`，v0.1 必报 `E_UNKNOWN_KEY`；若删除它，又不满足路线图的完整 ID 链。本次按任务单 v0.1 的显式字段和严格模式实现，未自行增加字段。
- closeout 状态受白名单限制：task-closeout 要求任务单含 list-form `status: [done]` 和三段报告，但 `docs/sam/tasks/P0a-2_contract_validator_TASK.md` 不在 §2 可写白名单（且当前不是该格式）；未越权回写。需要主会话授权后按该技能的闭环格式更新任务单并重跑 closeout check。

P0a-2 DONE
