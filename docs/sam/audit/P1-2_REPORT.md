# P1-2 配准小工具执行报告

## 交付物清单

- `tools/sam/georef/index.html`：纯静态工作台页面；可用仓库相对 URL 参数载入图片和地名表，也可选择本地文件；页面载入 `research_contract.js` 与纯函数核心，不改动 `index.html` 或 `js/app.js`。
- `tools/sam/georef/georef.css`、`tools/sam/georef/georef_ui.js`：浅色、右侧可折叠面板；画布滚轮缩放、鼠标／单指平移、双指缩放；控制点、数字化点／折线、残差、导入导出和 localStorage 状态续作。URL 参数拒绝协议、`//`、绝对路径、反斜杠与（解码后的）`..`。
- `tools/sam/georef/georef_core.js`：浏览器挂载 `globalThis.SamGeorefCore`、Node 可 `require` 的纯函数；含仿射／二次最小二乘、退化拒绝、haversine、残差和留一法、GCP 集与 GeoJSON 构建。
- `scripts/sam/georef_core.test.js`：`node:assert` 的七组正例／负例测试。
- `scripts/sam/fixtures/georef_demo/demo.svg`、`scripts/sam/fixtures/georef_demo/gazetteer.json`：合成方格图与合成地名表。地名、坐标和状态均为测试数据，未使用 `docs/sam/files/` 的史料图像。

## 验证结果（逐项）

1. `node --check tools/sam/georef/georef_core.js`、`node --check tools/sam/georef/georef_ui.js`、`node --check scripts/sam/georef_core.test.js`：exit 0，无输出。
2. `node scripts/sam/georef_core.test.js`：exit 0，真实输出：

   ```text
   georef_core.test.js: 7 required assertions groups passed
   ```

   覆盖已知仿射和二次参数还原、RMS、500 m 离群点的留一法最大且超过其余点五倍、两种点数不足、三点共线退化、`E_OBSERVED` 负例、`validateDataset` 无 error，以及开封—郑州约 62 km。
3. `node scripts/validate_atlas.js`：exit 0，真实输出：

   ```text
   ✓ Jiangshan Atlas validation passed in 58481.7 ms:
     - 18 dynasties, 167 snapshots (165 phase-linked), 2430 timeline years swept
     - 15204 historical polygons (2,421,917 vertices) verified lossless & collision-free
     - 35 modern provinces (314 rings)
     - 1387 ancient settlements & 442 historical milestones
     - 7 journeys (68 bilingual stops), 351 era spans, 571 landmark events & 185 gazetteer landmarks verified across 27 E2E CUJs
   ```
4. `git diff --check`：exit 0，无输出。开始时 `git status --short` 为空；结束时仅出现本单新建的白名单路径。
5. `task_closeout.py check ... --require-readback --record-debt`：exit 1。报告文件存在且读回包含 `P1-2 DONE`，但任务单本身没有列表形式的 `status: done`（检查器实测 `status_values: []`、`status_done: false`，且 `report_found: false`）。任务单不在本单白名单，故未越权修改；该项已由检查器记录为 closure debt，须主会话在获准修改任务单后回填状态／任务内报告并重跑 closeout。
6. 浏览器内行为：待主会话浏览器终验。未运行 Playwright：环境没有全局 `playwright-cli`，而其 `npx` 包装器可能下载外部包，违反本单“不得安装依赖／引入外部库”的禁止项。终验步骤与预期如下：
   - 在仓库根启动静态服务器，打开 `tools/sam/georef/?img=scripts/sam/fixtures/georef_demo/demo.svg&gaz=scripts/sam/fixtures/georef_demo/gazetteer.json`；预期载入合成图、SHA-256、1200×800 尺寸和 6 个 `FOUND` 候选（`UNVERIFIED` 的 `Missing` 不出现）。
   - 点图面空白处，搜索并选择地名或手输经纬度；预期出现编号十字、列表含像素／度／米，拖动可微调，停用点不参与变换。
   - 填足 3／6 个非退化控制点；预期仿射／二次按钮分别可选，显示 RMS、各点残差和留一法，超过两倍 RMS 的点呈警示色。
   - 用“点要素”与“连线”分别数字化并填 1938-06-01；预期单日自动导出为 `[1938-06-01, 1938-06-02)`；故意将终日改为同日时，导出面板显示 `E_OBSERVED` 且不下载 GeoJSON。
   - 填写 `source_id` 后导出 GCP 与 GeoJSON，再同时载入二者；预期像素点可继续编辑，变换改变后要素经纬度随之重算。`?img=https://…`、`?img=//…`、`?img=../…` 应显示拒绝信息。
   - iPad 竖屏：侧栏改在底部；单指拖图、双指以两指中心缩放、控制点和按钮均可触达，不依赖 Shift（连线有独立按钮）。

本单里的数与你实测有出入吗？无。合成 fixture 为 1200×800，并未声称达到任务单所述真实图的约 2400×1700／最大 8500×6800；后两项尚待上述真实图终验。

## 规格偏差

无。未改白名单外文件，未安装依赖、未引入外部库或 CDN，也未读取 `js/app.js`。

设计风险（未擅自改方案）：单一全图 affine／二次变换和全图 RMS 对折页、扫描纸张局部拉伸或拼接缝没有局部误差模型；例如左上角与右下角各有良好控制点时，折缝附近仍可能明显偏移而全局 RMS 很低。若真实图终验遇到这一例，应由主会话决定是否另立任务加入分片／薄板样条及其证据、误差表达，不应在本单中悄然替换变换模型。

P1-2 DONE

## r2

### 交付物清单

- R2-1：`georef_core.js` 新增纯函数 `imageBinding`、`exportReadiness`。当前图像 SHA／宽高与控制点所属 SHA／宽高分别保存在状态中；图片载入只改当前图像字段，`safeStore` 不再保存这些当前图像字段。首个新控制点绑定当时图像；GCP 导入仅写控制点所属字段。已载入图片时，SHA 或宽高不一致（包括任一方缺失）会在任何状态写入前拒绝，并显示 SHA 前 12 位或双方尺寸。两种导出均先检查图像绑定。
- R2-2：保留主会话加入的 `[hidden] { display: none !important; }`；将窄屏规则改为 `orientation: portrait` 且 `max-width: 1100px` 的底部抽屉。收起时由 `main.drawer-collapsed` 隐藏抽屉并令图像区占满可用高度。
- R2-3：保留原有 `2×RMS` 警示色；留一法最大启用点在画布以紫色 `★` 编号、列表以紫色边标出，变换面板显示“留一法最大：#k 名称 N 米”。
- R2-4：`gcp_set.loo_residuals_meters` 现逐项对应 `control_points`；停用项为 `null`。
- R2-5：GeoJSON 导出要求仿射至少 4 个、二次至少 7 个启用控制点；恰好最少点数时拒绝并显示“无冗余，RMS 不代表误差”。`gcp_set` 导出不施加该冗余门槛。
- R2-6：控制点列表压为三行：编号／名称与残差、像素／经纬度、小型三按钮行；数值使用等宽字体，按钮最小高度仍为 32px。

### 验证结果（逐项）

1. `node scripts/sam/georef_core.test.js`：exit 0，真实输出：

   ```text
   georef_core.test.js: 11 required assertions groups passed
   ```

   新增可失败断言覆盖：图像与 GCP SHA／尺寸相同、不同、缺失；GCP 导出在尺寸不符时拒绝；停用点的对齐 LOO 槽为 `null`、启用点保留数值；仿射 3 点和二次 6 点 GeoJSON 导出拒绝、二次 7 点放行；以及 `[hidden]` 保留、portrait 1100px 断点、收起时全高图像区。
2. CSS 静态规则检查：768×1024、820×1180、1024×1366 三个尺寸均为竖屏且宽度不大于 1100px，均命中 `@media (orientation: portrait) and (max-width: 1100px)`；横屏不命中该规则。此项为 Node 静态断言，未替代触控浏览器终验。
3. `node --check tools/sam/georef/georef_core.js` 与 `node --check tools/sam/georef/georef_ui.js`：exit 0，无输出。
4. `node scripts/validate_atlas.js`：exit 0，真实输出：

   ```text
   ✓ Jiangshan Atlas validation passed in 45300.9 ms:
     - 18 dynasties, 167 snapshots (165 phase-linked), 2430 timeline years swept
     - 15204 historical polygons (2,421,917 vertices) verified lossless & collision-free
     - 35 modern provinces (314 rings)
     - 1387 ancient settlements & 442 historical milestones
     - 7 journeys (68 bilingual stops), 351 era spans, 571 landmark events & 185 gazetteer landmarks verified across 27 E2E CUJs
   ```

本节给出的数与实测无出入。未重复浏览器／iPad 终验：环境没有全局浏览器 CLI，而通过 `npx` 取得它可能安装依赖，违反本单禁止项；主会话应重点复验错误 GCP 导入的状态不变、实际竖屏抽屉和 `★` 标记。

### 规格偏差

无。仅修改白名单路径，未改动 `docs/sam/ROADMAP.md`、任务单正文、仓库根 `index.html`、`js/app.js`，未安装依赖或引入外部库／CDN。原有 closeout debt 仍在：任务单未提供列表形式 `status: done`，而任务单本身不在白名单，故本次不越权回填。

P1-2 r2 DONE

## 主会话验收（2026-10-24，Sam's Agent(Opus-5.5)）

**结论：r2 通过，提交。** 三套 Node 测试 exit 0（georef 11 组）。浏览器（本地 8765，真实图 D5 p05 与合成图）逐条复验：

| 项 | 复验 | 结果 |
|---|---|---|
| R2-1 | 载入改了 SHA／改了宽度／删掉 SHA 的 gcp_set ⇒ 三种都拒绝，提示带两段 SHA 前 12 位或两组尺寸；控制点数、当前图像 SHA 与尺寸都不变；同 SHA 文件正常载入。刷新后换成合成图 ⇒ 状态栏提示控制点所属 SHA 与当前不符，两种导出都拒绝 | 通过 |
| R2-2 | 768×1024 竖屏 ⇒ 底部抽屉 | 通过；**主会话补一处**：`index.html` 的 `<main>` 缺 `id="main"`，「☰ 面板」一点就抛 TypeError、抽屉收不起来，已补上属性后复测收起／展开正常 |
| R2-3 | 5 点时图上 #2 带 ★、列表紫色边、面板「留一法最大：#2 B 107429.1 米」 | 通过（面板里「留一法最大」出现两行，一行在指标表、一行在说明，属 COSMETIC） |
| R2-4 | 导出 gcp_set：5 个控制点、`loo_residuals_meters` 长 5 | 通过 |
| R2-5 | 恰 3 点 ⇒ GeoJSON 拒绝「无冗余，RMS 不代表误差」；4 点以上放行 | 通过 |
| R2-6 | 每点三行、按钮一行三个 | 通过 |

遗留（不阻断，未派）：抽屉收起／展开后图像不重新适配视口（画布尺寸会跟上，图像位置不变，需手动缩放）；iPad 实机触控未测（本机只能模拟视口）。
