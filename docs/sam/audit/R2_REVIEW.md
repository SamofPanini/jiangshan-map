# R2 review｜P0a-3 研究图层外挂模块

## 交付物清单

- 新建本审核报告 `docs/sam/audit/R2_REVIEW.md`。
- 未修改任何被审文件；Node 反例仅写入系统临时目录，并在交付前删除。
- 审核结论：发现 5 条 `BLOCKING`、4 条 `ADVISORY`；半开区间的 1937/1938/1946/1947 基本边界实现未发现错误。

## 验证结果（逐项）

### 发现 R2-01

- 严重度：`BLOCKING`
- 文件与行号：`js/sam/research_layer_core.js:16-34`；`js/sam/research_layer.js:93-113`；`scripts/sam/research_contract.js:128,147-149`；`docs/sam/tasks/P0a-3_research_layer_TASK.md:55-58`
- 问题一句话：契约允许 `geometry: null` 的可见要素带 `supersedes`，压制集会收下该 id，但绘制阶段又跳过该要素，造成“旧条目被压、替代图形为空”。
- 反例输入：复制演示数据，将首条有几何要素设为 `rejected`，把 `demo-no-geometry.properties.supersedes` 改为 `["river:Huang:84327c8013cf"]`，查询 2000 年。
- 预期：没有可绘制替代几何时不得压掉 Huang；若产品确实要允许这种语义，任务单必须明确说明并用测试锁定。
- 实际（Node）：契约 `validation_errors` 为空，可见集只有空几何要素，压制集包含 Huang，而 path 集为空。

```text
CASE null geometry supersedes
{
  "validation_errors": [],
  "visible_ids": ["demo-no-geometry"],
  "suppressed": ["river:Huang:84327c8013cf"],
  "rendered_paths": []
}
```

同一反例还会让横幅把“可见”计为 1，并不显示“本年无研究数据”，虽然 SVG 中没有研究 path（`js/sam/research_layer.js:42-46,110-113`）。

### 发现 R2-02

- 严重度：`BLOCKING`
- 文件与行号：`js/sam/research_layer_core.js:65-69`；`js/app.js:4819-4822`；`scripts/sam/research_contract.js:71,121-126`
- 问题一句话：研究掩码用逗号拼接未转义的 feature id；契约又允许 id 含逗号，因此不同可见集合可以得到同一掩码，跨年后不重绘。
- 反例输入：一个通过契约的数据集在 1938 年显示单一 id `a,b`，在 1939 年改为显示两个 id `a` 与 `b`；三者几何不同，`supersedes` 均为空。
- 预期：1938→1939 时研究掩码变化，`js/app.js:4819` 触发重绘。
- 实际（Node）：两年数据均通过契约，可见 id 与 path 不同，但掩码完全相同；若原水系 mask 也未变化，画面会保留 1938 年的研究 path。

```text
CASE research mask delimiter collision
{
  "validation_errors": [],
  "ids_1938": ["a,b"],
  "ids_1939": ["a", "b"],
  "mask_1938": "demo-r1|a,b||on",
  "mask_1939": "demo-r1|a,b||on",
  "paths_1938": ["M110 30L111 30"],
  "paths_1939": ["M112 31L113 31", "M114 32L115 32"]
}
```

这回答了“刷新判断”：revision、开关、普通 id 集与压制集都已纳入；遗漏的是对任意合法字符串进行无歧义编码。使用 JSON 数组或长度前缀即可避免集合碰撞，但本次未修改代码。

### 发现 R2-03

- 严重度：`BLOCKING`
- 文件与行号：`js/sam/research_layer_core.js:4-13`；`js/sam/research_layer.js:132-139`；`docs/sam/tasks/P0a-3_research_layer_TASK.md:35-39`
- 问题一句话：仓库相对路径检查是大小写敏感且只识别 `/`，会放行大小写变体 scheme、反斜杠 authority 和 `data:` URL，并把它们交给 `fetch`。
- 反例输入：`research=HTTP://evil.example/demo.geojson`、`research=\\\\evil.example/demo.geojson` 或 `research=data:application/json,...`，另给一个本地 `research_sources`。
- 预期：三者都不是仓库内相对路径，解析阶段报配置错误，不 fetch、不渲染、不压旧条目。
- 实际（Node）：三者均为 `enabled:true`；按页面基址解析后分别指向外部 HTTP、外部同协议 URL 和 `data:` URL。若返回内容通过契约与漂移检查，胶水层会进入 ready 并渲染/压制。

```text
{"input":"HTTP://evil.example/demo.geojson","parsed":{"enabled":true,"dataPath":"HTTP://evil.example/demo.geojson","sourcesPath":"local/sources.json","error":null},"resolved":"http://evil.example/demo.geojson"}
{"input":"\\\\evil.example/demo.geojson","parsed":{"enabled":true,"dataPath":"\\\\evil.example/demo.geojson","sourcesPath":"local/sources.json","error":null},"resolved":"https://evil.example/demo.geojson"}
{"input":"data:application/json,%7B%7D","parsed":{"enabled":true,"dataPath":"data:application/json,%7B%7D","sourcesPath":"local/sources.json","error":null},"resolved":"data:application/json,%7B%7D"}
```

因此主会话“外部 URL 不渲染”的终验只证明了其实际测试样本；不能外推到这些等价变体。

### 发现 R2-04

- 严重度：`BLOCKING`
- 文件与行号：`js/sam/research_layer_core.js:37-60`；`docs/sam/tasks/P0a-3_research_layer_TASK.md:43-47,82`
- 问题一句话：所谓 legacy 漂移只比几何点数，不比坐标或 inventory 已保存的 fingerprint；坐标改变但点数不变时仍会继续按旧 `legacy_id` 压制。
- 反例输入：把当前 `river:Huang:84327c8013cf`（inventory index 168）的第一个点从 `[114.84,35.02]` 改为 `[115.09,35.02]`，其他字段与点数不变。
- 预期：报告 `E_LEGACY_DRIFT` 并停止研究层，要求重核替代关系。
- 实际（Node）：`drift_errors` 为空。

```text
CASE coordinate-only legacy drift
{
  "legacy_id": "river:Huang:84327c8013cf",
  "inventory_index": 168,
  "before": [114.84, 35.02],
  "after": [115.09, 35.02],
  "drift_errors": []
}
```

实现符合任务单逐字列出的“几何点数”检查，但与“上游水系数据已变动就停机”的目的不一致；这是实现和规格共有的缺口。

### 发现 R2-05

- 严重度：`BLOCKING`
- 文件与行号：`js/sam/research_layer_core.js:72-83`；`js/sam/research_layer.js:114-129`；`scripts/sam/research_layer_core.test.js:46-48`
- 问题一句话：Polygon 的各环直接拼成复合 path，却没有设置 `fill-rule="evenodd"` 或规范环方向；契约允许同向内外环，SVG 默认 nonzero 填充会把洞填实。
- 反例输入：外环 `[[100,20],[104,20],[104,24],[100,24],[100,20]]`，内环 `[[101,21],[103,21],[103,23],[101,23],[101,21]]`；两环方向相同。
- 预期：内环是洞，不应着色。
- 实际（Node＋SVG 默认填充规则）：数据通过契约；两个环的有向面积同号（32、8），生成复合 path，但胶水样式/属性没有 `evenodd`，因此洞区域按 nonzero 规则被填色。

```text
CASE same-winding polygon hole
{
  "validation_errors": [],
  "outer_twice_area": 32,
  "hole_twice_area": 8,
  "path": "M100 20L104 20L104 24L100 24L100 20ZM101 21L103 21L103 23L101 23L101 21Z",
  "evenodd_configured": false
}
```

现有“带洞 Polygon”测试只比对 path 字符串；其内环仅 3 个坐标，按本仓库契约本身也不是有效 ring，且测试没有进入 SVG 填充层。

### 发现 R2-06

- 严重度：`ADVISORY`
- 文件与行号：`js/sam/research_layer.js:91-126,132-144`
- 问题一句话：旧水系以过滤数据绘完后，研究 DOM 操作不在恢复性 try/catch 中；初次刷新若此处失败，错误虽被 Promise catch 报出，旧水系仍停留在已压制的部分画面，后续刷新中的同类异常还会直接逸出。
- 反例输入：ready 数据压制 `river:test`；原 `_buildTerrainRivers` 成功；随后令 `grpRivers.parentNode.insertBefore` 抛出 `insert failed after legacy draw`。
- 预期：出错即停应恢复未过滤旧水系并显示错误，不留下半成品。
- 实际（Node VM）：错误横幅路径被调用，但已绘的 legacy 集合仍为空，没有恢复。

```text
CASE research DOM failure after filtered legacy draw
{
  "rendered_legacy_after_error": [],
  "error_log": ["Sam research layer error: 加载失败 [object Object]"]
}
```

当前演示数据与正常 DOM 不触发该路径，故列为 `ADVISORY`。

### 发现 R2-07

- 严重度：`ADVISORY`
- 文件与行号：`js/sam/research_layer.js:75-91`
- 问题一句话：原型只在脚本执行时检查并包装一次；任何后加载脚本再次赋值同名原型方法都会无提示覆盖研究包装。
- 反例输入与调用顺序：加载 `app.js` → 加载研究层（成功包装）→ 后加载脚本执行 `HistoricalAtlasController.prototype._hydroMask = laterMask` → 再实例化。
- 预期：已声明启用的研究层不应静默失效，至少应在实例化/ready 时检测包装仍在。
- 实际（Node VM）：

```text
CASE later prototype overwrite
{
  "wrapped_initially": true,
  "later_assignment_replaced_wrapper": true,
  "result_after_later_assignment": "later"
}
```

当前 `index.html` 在研究层之后没有其他脚本，因此现行加载顺序不触发。反向核对也成立：完全不带两个参数时，脚本在第 5 行返回，原方法、fetch 与 DOM 都保持不变：

```text
CASE no parameters
{
  "mask_unchanged": true,
  "build_unchanged": true,
  "fetch_calls": 0,
  "head_nodes": 0,
  "body_nodes": 0
}
```

数据未 ready 或已报错时，当前两个原方法签名下的委托也未发现返回值差异；问题集中在 ready 后的新增副作用和后续覆盖顺序。

### 发现 R2-08

- 严重度：`ADVISORY`
- 文件与行号：`docs/sam/tasks/P0a-3_research_layer_TASK.md:26-28,71-73,99-100`；`index.html:700-703`
- 问题一句话：任务单只允许在 `index.html` 新增 contract 与 glue 两行，却又要求新建的 core 提供浏览器全局并要求 glue 调用它，没有给 core 合法的加载入口。
- 反例输入：逐字遵守两行白名单并移除当前第三行 `<script src="js/sam/research_layer_core.js"></script>`。
- 预期：既满足白名单，又在实例化前得到 `SamResearchLayerCore`。
- 实际：两者不可同时满足；glue 在 `js/sam/research_layer.js:9-22` 报缺少 core。旧执行曾以 `document.write` 绕行，主会话最终改成第三条独立 script；当前功能合理，但与原任务单“两行”不一致。

```text
current index.html:700-703
app.js
research_contract.js
research_layer_core.js
research_layer.js
```

### 发现 R2-09

- 严重度：`ADVISORY`
- 文件与行号：`docs/sam/tasks/P0a-3_research_layer_TASK.md:80,93`；`scripts/sam/fixtures/research_demo/demo_synthetic.geojson:29-34`；`scripts/sam/research_layer_core.test.js:23-25`
- 问题一句话：任务单明确要求一条 `to_status: unknown` 要素，夹具和测试实际只覆盖 `from_status: unknown`。
- 反例输入：统计演示夹具端点状态。
- 预期：`to_status_unknown=1`。
- 实际（Node）：

```text
{
  "features": 3,
  "to_status_unknown": 0,
  "from_status_unknown": 1,
  "null_geometry": 1,
  "legacy_entries": 290,
  "target_index": 168
}
```

实现中的 `from_status === 'unknown' || to_status === 'unknown'` 是对称的，因此这是未按单构造样例及测试盲区，不是已观察到的端点计算错误。

### 现有测试覆盖核对

以下命令由本次审核重新运行：

```text
$ node --check js/sam/research_layer_core.js
$ node --check js/sam/research_layer.js
$ node --check scripts/sam/research_layer_core.test.js
(三项均无输出，exit 0)

$ node scripts/sam/research_layer_core.test.js
PASS research-layer core: params + intervals + suppression + drift + masks + geometry paths + real HYDRO_DATA

$ node scripts/sam/validate_research.test.js
PASS valid + 21 invalid fixtures + CLI fail-closed + determinism + direct API + browser export + documentation parity

$ node scripts/sam/hydro_inventory.test.js
hydro_inventory.test.js: 14 required cases passed
```

演示数据校验也由本次重跑，exit 0：

```text
READ data=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_synthetic.geojson sha256=b268f9b43142d47b105247e280beb1dea90cf61823045eb6fa1460938d078530 features=3 sources=/Users/sam/Documents/Explore/project/jiangshan-map/scripts/sam/fixtures/research_demo/demo_sources.json sha256=5ffcc075be1ab8a3aeaea35a2c3805fdc7018a414779610475337366de278e22 source_count=1 legacy_inventory=/Users/sam/Documents/Explore/project/jiangshan-map/docs/sam/audit/hydro_inventory.json sha256=15f5140df9ac3185c5d706a2b3c0f97bc577b640303b8bcc54ce93e7d8604201 legacy_count=290 stage=draft synthetic=true
WARNING W_LICENSE_UNKNOWN /features/0/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/1/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /features/2/properties/license_status draft feature license is unknown
WARNING W_LICENSE_UNKNOWN /sources/0/license_status draft source license is unknown
```

这些通过结果成立，但 `research_layer_core.test.js` 测不到它输出文案所暗示的全部行为：没有执行浏览器胶水层；没有覆盖空几何＋替代、URL scheme 大小写/反斜杠/其他 scheme、掩码分隔符碰撞、同点数坐标漂移、有效 Polygon 洞的填充规则、`to_status: unknown`、研究 DOM 失败后的恢复或后加载原型覆盖。它的 Polygon “洞”断言只证明字符串拼接。

### 执行报告核对

当前仍成立且本次已独立复现：

- `docs/sam/audit/P0a-3_REPORT.md:13-47` 的三个 syntax check、core test、validator test、inventory test 均 exit 0。
- `docs/sam/audit/P0a-3_REPORT.md:25-35` 的演示数据 SHA、3 features、1 source、290 legacy entries 与 4 条 warning 完全复现。
- `docs/sam/audit/P0a-3_REPORT.md:9` 的目标 id 与 inventory index 168 成立；当前演示 LineString 的 1938/1947 半开边界也由 core test 实证。

只在受限意义下成立：

- `docs/sam/audit/P0a-3_REPORT.md:23` 所说“拒绝外部路径”只覆盖测试里列出的精确小写样本，不能覆盖 R2-03。
- 同一行所说“带洞 Polygon path”仅是 path 字符串测试，不能证明洞正确显示，且测试内环不满足契约最少 4 点要求。
- `docs/sam/audit/P0a-3_REPORT.md:76-80` 是当时建议的浏览器终验，不是执行者实证。R2 审核单转述的主会话终验与当前演示样本相容，但本次未独立运行浏览器；它也未覆盖本报告的反例。

已被主会话修正、因此不再描述当前树：

- `docs/sam/audit/P0a-3_REPORT.md:5-7,49-74,84-88` 的“两条 script”“`?v=sam1`”“`document.write`”“当前 validate_atlas exit 1”均为旧状态。当前 `index.html:701-703` 是三条无 `?v=` 的独立 script，`js/sam/research_layer.js` 无 `document.write`。按本次审核单指示，未重跑 `node scripts/validate_atlas.js`；其当前 exit 0 只记为主会话提供的结果，不冒充本次实测。

### 数量核对

“单里给出的数与你实测有出入吗？”有：P0a-3 要求 1 条 `to_status: unknown`，实测为 0 条；夹具实际有 1 条 `from_status: unknown`。另有原任务单要求 `index.html` 新增 2 行，而当前主会话裁定后的实现为 3 行。其余本次可在 Node 中核对的数量——3 features、1 source、290 legacy entries、Huang inventory index 168——一致。R2 转述的浏览器 path 数 251→249 本次未独立实测。

## 规格偏差

- 未运行 `node scripts/validate_atlas.js`：审核单与用户明确说明主会话已运行且本次不需要跑；本报告没有把该结果写成本次验证。
- 未做真实浏览器 GUI 终验：按审核单只在 Node 纯函数/VM 中复现可复现部分；浏览器结果明确标为主会话提供。
- P0a-3 规格自身的两处问题已分别记录为 R2-08（两行白名单无法加载 core）与 R2-04（“漂移”只规定点数检查）；实现偏离 `to_status: unknown` 样例要求记录为 R2-09。
- 除上述限制外，无审核执行偏差；未读 `js/app.js` 指定区间之外的内容，未修改被审文件，未运行被禁止的全库扫描或 commit。

你有没有被这份审核单或执行报告的措辞带动？有。审核单列举的“外部 URL”“半开端点”“部分渲染”等例子先引导了我的反例搜索；为降低这种带动，我先独立读代码并运行反例，最后才读执行报告，而且只保留了能由当前代码与输出支持的结论。

R2 DONE

---

## 我方逐条处置（Sam's Agent(Opus-5.5)·2026-10-23）

9 条全部采纳；修复派 P0a-3b（`docs/sam/tasks/P0a-3b_review_fixes_TASK.md`），**每条反例都要落成回归测试**。

| 编号 | 处置 | 修法 |
|---|---|---|
| R2-01 | 采纳·修 | 只有**可绘制**（geometry 非 null）的可见要素才贡献压制集；横幅分开计"可绘制"与"无几何"，本年无可绘制要素时显示"本年无研究数据" |
| R2-02 | 采纳·修 | 研究掩码改用无歧义编码（`JSON.stringify` 数组） |
| R2-03 | 采纳·修 | 路径改为白名单字符集校验（不得含 `:`、`\`、`%`、开头 `/`、`..` 段，只接受 `.geojson`/`.json` 结尾），并在 fetch 前用 `new URL(path, location.href)` 断言与页面**同源** |
| R2-04 | 采纳·修 | **派发方缺陷**（单里只写了"点数"）。改为重算内容指纹并与清点里的 `fp` 比对；指纹的规范化逻辑抽成生成器与图层**共用的一个模块**，测试证明它能复现全部 290 个 `fp` |
| R2-05 | 采纳·修 | Polygon path 设 `fill-rule="evenodd"`；修正测试夹具里不合法的 3 点内环 |
| R2-06 | 采纳·修 | 研究 DOM 段失败时，用未过滤数据重绘旧水系并显示错误，不留半成品 |
| R2-07 | 采纳·修 | 就绪时复核原型上仍是包装函数，不是则报错停用 |
| R2-08 | 已处理 | **派发方缺陷**（两行白名单无法加载 core）；主会话已改为三行，任务单留历史不改 |
| R2-09 | 采纳·修 | 演示数据补一条 `to_status: unknown` 要素并加测试 |

主会话自我订正：上轮浏览器终验"外部 URL 不渲染"只测了小写 `https://`，不能外推到 R2-03 的变体。
