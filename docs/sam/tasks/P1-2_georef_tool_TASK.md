# 任务单 P1-2｜浏览器配准小工具：点控制点、算变换、数字化前锋、导出研究图层

- task_id：`jsm-p1-2-georef`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex GPT-5.6 Terra
- 建立：2026-10-24；状态：done（r1 2026-10-24 退回 §8；r2 2026-10-24 主会话验收通过，见报告末节）
- 路线图位置：`docs/sam/ROADMAP.md` §6 黄河 P1。Sam 2026-10-24 裁定：先用地名锚定出第一版，再做本工具精配准

## 0. 开工前必读

1. 仓库根 `AGENTS.md`；`docs/sam/CONTRACT.md`（v0.2）与 `scripts/sam/research_contract.js`。
2. 本单全文。
3. 不读 `js/app.js`；不运行 `git status`／`git diff` 以外的全库扫描；不 commit；**不安装依赖、不引入任何外部库或 CDN**（纯 HTML＋JS＋CSS）。

## 1. 用途

旧地图（这次是 1938 年日军经过要图与 1:5 万『新黄河流域圖』的分拍照片）**图廓上没有经纬度**，只能靠控制点配准：用户在图上点出今天还能定位的城镇，与现代坐标对应，求变换；再在图上点出泛滥前锋等要素，换算成经纬度，导出成研究图层数据。用户是研究者本人，在 MBP 的浏览器里用，也会经 Tailscale 在 iPad 上用（触控）。

## 2. 白名单

| 路径 | 改动 |
|---|---|
| `tools/sam/georef/index.html`、`tools/sam/georef/georef.css`、`tools/sam/georef/georef_ui.js` | 新建：页面与界面胶水 |
| `tools/sam/georef/georef_core.js` | 新建：纯函数（无 DOM），Node 与浏览器都能加载（浏览器挂 `globalThis.SamGeorefCore`） |
| `scripts/sam/georef_core.test.js` | 新建：Node 测试 |
| `scripts/sam/fixtures/georef_demo/` | 新建：合成测试图与合成 gazetteer（见 §6） |
| `docs/sam/audit/P1-2_REPORT.md` | 新建：报告 |

## 3. 功能

### 3.1 载入

- 图像：URL 参数 `img=<仓库内相对路径>`（规则同研究图层：拒绝 `http:`、`//`、`/` 开头与 `..`），或页面上的"选择文件"（iPad 也要能用）。
- 地名表：URL 参数 `gaz=<仓库内相对路径>`，JSON 数组，每项至少 `name_on_map`、`modern_name`、`lat`、`lon`、`status`、`source_url`；`status` 不是 `FOUND` 的不进候选。没给 `gaz` 时只能手输经纬度。
- 图像标识：`image_label`（用户可编辑的短名，如 `D5-p05`）与图像的 SHA-256（用 Web Crypto 计算），写进导出文件，防止把控制点用到另一张图上。

### 3.2 看图

- 滚轮／触控双指缩放、拖动平移；缩放以指针位置为中心。大图（约 2400×1700，最大 8500×6800）要流畅：用 `<canvas>` 或 CSS transform 均可，但不得每次重绘都重新解码图像。

### 3.3 控制点模式

- 点一下图 ⇒ 在该像素放一个控制点 ⇒ 弹出小面板：从地名表里搜（按 `name_on_map` 或 `modern_name` 子串）选一个，或手输经纬度。
- 控制点列表：名称、像素坐标、经纬度、残差（米）；可选中、拖动微调、删除、暂时停用（停用的不参与求解）。
- 变换：`affine`（≥3 点，最小二乘）与 `poly2`（二次多项式，≥6 点）；点数不够时不允许选。
- 显示：总 RMS（米）、每点残差、**留一法残差**（去掉该点后用其余点求解再预测它——这是判断哪个点点错了的主要依据）。残差最大的点高亮。
- 距离一律用 WGS84 椭球近似的大圆距离（haversine 即可）。

### 3.4 数字化模式

- 点一下 ⇒ 加一个点要素；按住 Shift 或点"连线"按钮 ⇒ 依次点出折线。每个要素可填：`feature_type`（默认 `flood_front`）、`observed.as_written`、`date_from`、`date_to`（半开；单日时自动填下一天）、`part_of_day`、`locator`（如 `D5 p05 左上`）、`note`。
- 要素的经纬度随当前变换实时换算；变换一改，要素位置跟着改。

### 3.5 导出与续作

- **控制点集** `gcp_set.json`：`gcp_set_id`（用户填，或默认 `image_label`＋日期）、`image_label`、`image_sha256`、图像宽高、每个控制点（像素、经纬度、地名表来源 `source_url`、是否停用）、变换类型与参数、RMS、留一法残差。
- **研究图层数据** `*.geojson`：`schema_version: 0.2.0`、`stage: draft`、`synthetic: false`，每个要素 `derivation.method` 为 `georef_affine` 或 `georef_polynomial`、`gcp_set_id` 指向上面的集合；`spatial_error.value` 填该要素所在图的 RMS（米）、`reason` 写明"控制点 RMS，非单点误差"；`evidence_mode: attested`、`review_state: proposed`、`license_status: unknown`。**导出前用 `SamResearchContract.validateDataset` 校验，有 error 就不让导出并列出 error**。来源文件不在本工具里生成（由主会话另建），`claims` 的 `source_id` 由用户在导出面板填一个。
- 续作：能把 `gcp_set.json` 与已导出的 geojson 再载入继续编辑；编辑中的状态自动存 `localStorage`（读写都要 try/catch；没有存储也能正常用）。

## 4. 纯函数（`georef_core.js`）与测试

至少：`fitAffine(pairs)`、`fitPoly2(pairs)`、`applyTransform(t, x, y)`、`haversineM(a, b)`、`residuals(t, pairs)`、`looResiduals(kind, pairs)`、`buildGcpSet(state)`、`buildDataset(state)`。界面胶水必须调用这些函数，不得另写一份。

测试（`node:assert`，每条都要能失败）：
1. 用已知仿射生成 6 个无噪声点 ⇒ `fitAffine` 还原参数（误差 < 1e-9）、RMS ≈ 0。
2. 同样对二次多项式。
3. 在其中一点加 500 m 偏移 ⇒ 该点的留一法残差最大，且大于其余点的 5 倍。
4. 点数不足（仿射 2 点、二次 5 点）⇒ 抛出明确错误，不返回结果。
5. 共线的 3 点 ⇒ 仿射求解报"退化"错误，不返回 NaN 参数。
6. `buildDataset` 的输出过 `validateDataset` 无 error；故意把 `date_to` 设成等于 `date_from` ⇒ 有 `E_OBSERVED`，导出被拒。
7. `haversineM`：开封（34.80°N, 114.31°E）到郑州（34.75°N, 113.63°E）约 62 km（容差 1 km）。这两个坐标只作数学测试用。

## 5. 设计意图（Sam：功能不得牺牲 design）

- 这是研究者自己长期用的工作台工具：**安静、密度适中、不花哨**。浅色背景；图像占满主区域，控制点列表与属性面板收在右侧可折叠的侧栏（iPad 竖屏时改到底部抽屉）。
- 控制点用小十字＋编号，要素用小圆点，两者颜色明显不同；选中项加粗描边，不用闪烁动画。残差超过 RMS 两倍的点标成警示色。
- 数字一律右对齐、等宽字体；单位写明（米、度）。
- 触控目标不小于 32px；所有功能都能不用键盘完成（Shift 连线另提供按钮）。
- 不引入图标库；需要图标时用 Unicode 字符或内联 SVG。

## 6. 演示与测试用数据（`scripts/sam/fixtures/georef_demo/`）

- 一张**合成**测试图（脚本生成的 PNG 或 SVG：方格背景＋若干标了名字的圆点，**名字与坐标都是人造的**，如 `Alpha`、`Bravo`），配一份合成 gazetteer。不得使用 `docs/sam/files/` 里的任何史料图像（那些不进 git）。
- 报告里写明：主会话终验时会用 `?img=docs/sam/files/pages/D5/p05.jpg&gaz=…` 这样的真实图像在本地验。

## 7. 报告（`docs/sam/audit/P1-2_REPORT.md`）

1. §4 测试真实输出；
2. 浏览器内行为无法验证 ⇒ 写"待主会话浏览器终验"，列出检查步骤与预期现象（含 iPad 触控）；
3. 「本单里的数与你实测有出入吗？」；
4. 你认为本单设计有缺陷的地方，给具体例子，不要擅自换方案；
5. 最后一行：`P1-2 DONE`。

## 8. r2 返工（主会话验收 2026-10-24 23:00 所见；续同一 thread）

验收结论：纯函数与测试成立（真实图尺度 8500 px 下仿射／二次无噪声残差 ~1e-8 m）；URL 守卫五种拒绝全过；真实图 D5 p05（2400×1697）载入、59 个 FOUND 候选、控制点／停用／残差／留一法／RMS、点要素、半开日期自动补次日、`E_OBSERVED` 拒绝导出、合法导出与 gcp_set 导出均实测正常。以下须返工。

**主会话已改一处（保留，勿回退）**：`georef.css` 开头加了 `[hidden] { display: none !important; }`——原 `#empty-map { display: grid }` 盖过了 `hidden` 属性，真实图载入后占位层始终盖住画布、图像不可见。

| # | 级别 | 现象（复现） | 要求 |
|---|---|---|---|
| R2-1 | BLOCKING | 载入一张图后，再载入 `image_sha256` 不同的 gcp_set.json（例：把导出文件的 sha 改成 `0000`）⇒ 静默接受，且 `loadGcp` 用文件里的值**覆盖了当前图像的真实 SHA 与宽高**，之后两种导出都带着错的 SHA。§3.1 写 SHA 的目的正是防止控制点用到另一张图上。同族：`safeStore` 把 `imageSha256` 置空后存，恢复后旧控制点可以落到任何新图上 | ① 当前图像的 SHA／宽高只由图像本身决定，任何 JSON 载入不得改写；② 状态里另记「这组控制点属于哪个 SHA」（新建首个控制点时取当前图像 SHA；载入 gcp_set 时取文件里的），随 localStorage 一起存；③ 已载入图像且 SHA 不符 ⇒ 拒绝载入 gcp_set，状态不变，显示两段 SHA 前 12 位；宽高不符同理；④ 两种导出在「图像 SHA 未知」或「控制点所属 SHA ≠ 当前图像 SHA」时拒绝并说明；⑤ 判定写成 `georef_core.js` 纯函数（名字自定），加测试：相同／不同／一方缺失三种情形，每条都能失败 |
| R2-2 | BLOCKING | 窄屏断点是 `max-width: 720px`，而 iPad 竖屏宽 744–1024 ⇒ 实测 768×1024 时侧栏仍在右侧、约占一半宽度。§5 要求 iPad 竖屏改为底部抽屉 | 竖屏（`orientation: portrait`）且宽 ≤ 1100px 时用底部抽屉（可收起，收起时图像占满）；报告里写明你在哪几个尺寸下检查了 CSS 规则命中（至少 768×1024、820×1180、1024×1366） |
| R2-3 | ADVISORY | §3.3「残差最大的点高亮」未实现。另：现有警示色按「拟合残差 > 2×RMS」判，而数学上 max 残差 ≤ √n·RMS ⇒ **n ≤ 4 时永远不会触发**，恰是点最少、最需要提示的时候 | 保留 2×RMS 警示色；另把**留一法残差最大**的那个启用点用不同于警示色的方式标出（列表与图上都要），并在面板写一行「留一法最大：#k 名称 N 米」 |
| R2-4 | ADVISORY | `gcp_set.loo_residuals_meters` 只含启用点（实测 5 个控制点、1 个停用 ⇒ 数组长 4），与 `control_points` 下标错位 | 改为与 `control_points` 等长、停用点为 `null`；测试覆盖 |
| R2-5 | ADVISORY（本单§3.5 的设计缺陷，派发方的错） | 仿射恰 3 点（二次恰 6 点）时无冗余，RMS 恒 ≈ 0（实测 1.96e-9 m），被写进 `spatial_error.meters` 当成误差 | GeoJSON 导出要求启用点 ≥ 最少点数 + 1（仿射 ≥ 4，二次 ≥ 7），不足时拒绝并说明「无冗余，RMS 不代表误差」；gcp_set 导出不受限。测试覆盖 |
| R2-6 | ADVISORY（design） | 350px 侧栏里每个控制点占 4–5 行：px 与经纬度折行，「选／停用／删」分两行 | 每点压到 2–3 行：首行编号＋名称＋残差／留一法（右对齐等宽），次行 px 与度（等宽、小字），按钮一行三个，触控目标仍 ≥ 32px |

报告：在 `docs/sam/audit/P1-2_REPORT.md` 末尾追加「## r2」节（不改前文），逐条写改了什么、怎么验的、测试真实输出；最后一行改为 `P1-2 r2 DONE`。白名单不变（§2）；本节之外的规格不变。
