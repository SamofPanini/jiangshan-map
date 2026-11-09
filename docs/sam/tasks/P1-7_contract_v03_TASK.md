# 任务单 P1-7｜契约 v0.3：决口、泛滥主流、范围边界线；研究图层按日期显示这三类

- task_id：`jsm-p1-7-contract03`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex `gpt-6.1-terra` high（新线程）
- 建立：2026-11-09；状态：active
- 路线图位置：`docs/sam/ROADMAP.md` 第 6 项（黄河 P1）
- 依据：Sam 2026-11-09 采纳「决口另建事件点；6/15、6/24 主流侦察作新类型随 v0.3 定；逐日范围边界存成线、注明不闭合」。

## 0. 开工前必读与禁止事项

1. 仓库根 `AGENTS.md`。
2. `docs/sam/CONTRACT.md` 与 `scripts/sam/research_contract.js`（机读正典，本单要改它）。
3. `js/sam/research_layer_core.js`、`js/sam/research_layer.js`、`scripts/sam/research_layer_core.test.js`、`scripts/sam/validate_research.test.js`（都不长，可整份读）。
4. 背景（只读）：`docs/sam/audit/P0b-8_bmap_reading.md` §1（图例两类）、`docs/sam/tasks/P1-1_contract_v02_fronts_TASK.md`（v0.2 是怎么加的，照同样的兼容方式加 v0.3）。
5. 禁止：读 `js/app.js`；`git status`／`git diff`／`git log` 以外的全库扫描；commit；装依赖；联网。不改 `index.html`、`js/app.js`、`data/sam/**`。

## 1. 为什么改

B 图（1938 年 6–7 月）上有三种东西现行 v0.2 放不下或放得不准：
- 「10日 決潰」「11日 決潰」：决口事件的位置和日期。它不是前锋，也不是范围。
- 6/15、6/24 两次侦察画的是泛区内**主流的路线**（图例备考原文：范围内泛滥的主流由这两次侦察推知）。它不是范围边界。
- 其余日期的线是**当日浸水范围的边界**。原图上常常只画出一段，不闭合，硬凑成面就是编造。

## 2. 契约 v0.3.0（照此实现，不另选方案）

### 2.1 版本兼容
- `meta.schema_version` 接受 `0.1.0`、`0.2.0`、`0.3.0`；写入方常量 `SCHEMA_VERSION` 改为 `'0.3.0'`，`SUPPORTED_SCHEMA_VERSIONS` 加上 `0.3.0`。
- `0.1.0`、`0.2.0` 文件的校验行为**一个字节都不变**：本单新增的要素类型在这两版里出现 ⇒ `E_ENUM`；0.2.0 里 `flood_extent` 的几何规则保持现状。
- 0.3.0 继承 0.2.0 的全部规则，只加下面几条。

### 2.2 新增要素类型（仅 0.3.0）

| 类型 | 含义（原样写进 CONTRACT.md） | 允许的几何 | `observed` |
|---|---|---|---|
| `breach` | 堤防决口事件的位置 | `Point`、`MultiPoint`、null | 必须非 null |
| `flood_mainstream` | 某次观测（侦察）所见泛区内主流的路线 | `LineString`、`MultiLineString`、null | 必须非 null |

几何不符 ⇒ `E_GEOM_FEATURE`；`observed` 为 null ⇒ `E_OBSERVED`（与 `flood_front` 同一错误码）。

### 2.3 `flood_extent` 在 0.3.0 的几何
- 允许 `Polygon`、`MultiPolygon`（闭合的范围）和 `LineString`、`MultiLineString`（**原图画出的范围边界段，不闭合**）；`Point`／`MultiPoint` ⇒ `E_GEOM_FEATURE`。
- `observed` 仍是可为 null（没有日期的范围照旧可用）。
- 原样写进 CONTRACT.md：「`flood_extent` 的线几何只表示原图画出的边界段；不得据此补成面，也不得据此判断某地是否在泛区内。」

### 2.4 四类之间（原样写进 CONTRACT.md）
「`flood_front`（水边到达的位置）、`flood_extent`（浸水范围或其边界）、`flood_mainstream`（泛区内主流路线）、`breach`（决口）是四种不同的观测，不得互相推导。」

### 2.5 不在本单范围
审核记录仍推迟（触发条件不变：第一个要素由 `proposed` 走到 `accepted`）。CONTRACT.md 里 R1-07 那段的「推迟到 v0.3」改成「继续推迟，触发条件不变」。

## 3. 研究图层

### 3.1 行为
- `research_date` 过滤：现在只作用于 `flood_front`。改为作用于 `flood_front`、`flood_extent`、`flood_mainstream`、`breach` 四类中 `observed` 非 null 的要素（累积显示：`observed.date_from <= research_date` 才显示）。`observed` 为 null 的要素、其他类型不受影响。
- 日期标签：四类都画（规则同现有 `frontLabel`）。线要素的标签放在线的一个顶点旁（复用或推广现有 `featureLabelAnchor`）。
- 横幅：现有 flood_front 那行保留；另加一行，列出本年这四类各几个。

### 3.2 纯函数
推广现有函数（胶水层必须调用它们，不得另写一份）：`isObservedVisibleOn(feature, isoDate)`（新名；`isFrontVisibleOn` 保留为它的别名，现有测试照常通过，**除非**测试断言「非 flood_front 不受日期影响」——那条按新规则改写，报告里写明改了哪条、为什么）、`observedLabel(feature)`（`frontLabel` 保留为别名）。

### 3.3 设计（Sam：功能不得牺牲 design）
- 沿用现有研究色和「日期越晚越深」的单色梯度，不加第二套主色。
- `flood_extent` 线：细实线（约 1.2px，随缩放）。`flood_mainstream`：同色系更深一档、虚线，与范围线一眼可分。`breach`：小 × 记号（约 4px），不画圆点。
- 日期标签同现有：比上游地名小一档、同一字体族、无底框。
- 样式仍由脚本注入的 `<style>` 提供，不动上游样式。

## 4. 白名单

| 路径 | 允许的改动 |
|---|---|
| `scripts/sam/research_contract.js` | 按 §2 |
| `scripts/sam/validate_research.js` | 只为 §2 所需的最小修改 |
| `scripts/sam/validate_research.test.js`、`scripts/sam/research_layer_core.test.js` | 增加测试；§3.2 那一条按新规则改写 |
| `js/sam/research_layer_core.js`、`js/sam/research_layer.js` | 按 §3 |
| `docs/sam/CONTRACT.md` | 按 §2 同步（版本、兼容、枚举表、§2.2–2.4 原样句、R1-07 推迟说明） |
| `scripts/sam/fixtures/research_demo/` | 新增 `demo_v03.geojson`（见 §6）；不改现有文件 |
| `docs/sam/audit/P1-7_REPORT.md` | 新建 |

## 5. 测试（`node:assert`；每条都要能失败）
1. **旧版不变**：现有两份测试原样通过（§3.2 那一条除外）；现有 demo 文件与 `data/sam/huanghe1938/` 两份真实数据的校验输出与改动前逐字相同（报告贴前后对照）。
2. 0.2.0 文件出现 `breach` 或 `flood_mainstream` ⇒ `E_ENUM`；0.2.0 的 `flood_extent` 用 `Point` ⇒ 结果与改动前相同。
3. 0.3.0：`breach` 用 `LineString` ⇒ `E_GEOM_FEATURE`；`flood_mainstream` 用 `Point` ⇒ `E_GEOM_FEATURE`；两者 `observed: null` ⇒ `E_OBSERVED`；`flood_extent` 用 `MultiLineString` ⇒ 通过，用 `Point` ⇒ `E_GEOM_FEATURE`，`observed: null` ⇒ 通过。
4. `isObservedVisibleOn`：四类各一个 `date_from = 1938-06-14` 的要素，在 06-13 都不可见、06-14 都可见；`observed: null` 的 `flood_extent` 和 `river_course` 不受影响。
5. `observedLabel`：与现有 `frontLabel` 的两条用例相同结果；对 `flood_mainstream` 同样生效。
6. 变异自检：把 §2.2 的几何限制去掉，确认第 3 条失败；贴命令和失败输出，再恢复。

## 6. 演示数据 `demo_v03.geojson`
- `schema_version: 0.3.0`、`stage: draft`、`synthetic: true`，来源用现有合成来源。
- 至少：1 个 `breach` 点、1 条 `flood_mainstream` 线、2 条不同日期的 `flood_extent` 线（一条 `MultiLineString`）、1 个 `flood_front` 点。
- 坐标一眼人造（规则网格，小数全 0 或 5），在华北平原范围内，不取真实地名坐标；`description` 写 "synthetic demo for v0.3 breach/mainstream/extent-line mechanics, not historical"。
- 必须通过 `validate_research.js`（附输出）。

## 7. 报告（`docs/sam/audit/P1-7_REPORT.md`，中文）
1. 交付物；§5 全部测试的真实输出；改动前后校验输出对照。
2. 浏览器显示你的环境验不了 ⇒ 写「待主会话浏览器终验」，列建议 URL（`demo_v03.geojson`，带与不带 `research_date=1938-06-14`）和预期现象。
3. 本单的数与你实测有出入吗？有就报。
4. 你认为 §2 设计有缺陷的地方，给具体反例，不要擅自换方案。

**完工标记**：最后一行写 `P1-7 DONE` 或 `P1-7 BLOCKED`。
