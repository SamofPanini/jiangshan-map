# 任务单 S1｜上游同步（7c5cfe3）后的研究层适配

- task_id：`jsm-s1-upstream-sync-1103`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex `gpt-6.1-terra`（high）
- 建立：2026-11-03；状态：active
- 分支：`sync/upstream-1103`（HEAD `536560e`，已推送）。**在这个分支上工作，不切分支。**
- 路线图位置：`docs/sam/UPSTREAM_TRACKING.md`（上游吸收规程）；不改 ROADMAP

## 0. 开工前必读与禁止事项

1. 仓库根 `AGENTS.md`；`docs/sam/UPSTREAM_TRACKING.md` §C–E。
2. 研究层四个文件可整份读：`js/sam/research_layer.js`、`js/sam/research_layer_core.js`、`js/sam/legacy_fingerprint.js`、`scripts/sam/research_layer_core.test.js`。
3. **`js/app.js` 不得整份读入**（约 420KB）。只按本单 §3 给出的函数名用 `grep -n` 定位后，读该函数前后各约 40 行。
4. 不运行 `git status`／`git diff` 以外的全库扫描；不 commit、不切分支、不 merge；不安装依赖；不访问网络。
5. **上游文件一律不改**。可写范围（白名单）只有：
   - `js/sam/**`、`scripts/sam/**`
   - `docs/sam/audit/hydro_inventory.json`、`docs/sam/audit/corridor_inventory.json`、`docs/sam/audit/P0a-1_INVENTORY.md`（仅由 §4 的生成命令改写，不手改）
   - `docs/sam/UPSTREAM_TRACKING.md`、`docs/sam/UPSTREAM_FEEDBACK.md`
   - 新建 `docs/sam/audit/S1_REPORT.md`
   `index.html`、`AGENTS.md`、`js/*.js`（非 sam）、`scripts/*.js`（非 sam）、`css/` 都在白名单外。白名单外有必须改的地方 ⇒ 不改，写进报告。

## 1. 背景（已由派发方完成，不需要重做）

- 上游 main 曾被 force-push。旧基线 `a9cd67c` 与新历史中的 `4748ca2`（#125）**树完全相同**，真实增量是 `4748ca2..7c5cfe3` 共 89 个提交。
- 合并提交 `536560e`（父＝`e8f122b` 与上游 `7c5cfe3`）：fork 的 30 个提交已移植到新上游上；唯一冲突是 `index.html`，fork 的 4 个 `<script>`（`/sam/`）放在 `atlas_quiz.js` 之后。
- 派发方在合并后实测：
  - 上游 `node scripts/validate_atlas.js --fast` 通过；`node scripts/sync_version.js --check` 通过。
  - fork 四套测试：`georef_core`、`hydro_inventory`、`validate_research` 通过；**`research_layer_core.test.js` 失败**：R2-04「290 条 entry 须与指纹一致」，漂移 1 条＝`river:Namhan:d9a9167e1237`。
  - 上游在 4748ca2 之后改过 `js/china_geo_data.js` 的提交：#146、#216、#217（山川注记）。

本单数字与你实测不一致时，**报告出入，不要去凑**。

## 2. 问题一：URL 研究参数被上游的地址同步删掉（阻塞）

**事实**（上游 #191 起）：`AtlasController.prototype._urlStateParams()` 每次新建 `URLSearchParams`，只回填 `year／person／stop／polity／trace／terrain／lang`；`_writeUrlState()` 用 `history.replaceState` 写回。另有 `_syncUrlLangParam()` 也会写 URL。研究层只在脚本加载时从 `location.search` 读 `research`、`research_sources`、`research_date` 一次 ⇒ 用户改一次年份，URL 里的研究参数就没了；刷新或复制链接后研究模式消失。

**做法（照此实现）**：
- 在 `js/sam/research_layer.js` 里包装 `_urlStateParams`，方式与现有的 `_rescaleSvgTypography` 包装一致：先调原函数，再把研究参数加回去。原函数缺失 ⇒ 按现有的 fail-closed 方式报错，不静默跳过。
- 加回的值取**研究层启动时解析出的那一份**（启动时快照），不取当前 `location.search`。理由：当前 URL 可能已被上游改写过。
- 只在研究模式已启用时加回。未启用时，原函数的输出一个字节都不改。
- `research_date` 只在启动时它存在且合法时加回。
- 防篡改自检（现有的「原型方法被替换」检查）把这个新包装也纳入。
- `_syncUrlLangParam()` 走的是「保留现有参数，只改 lang」的路径，它本身不删研究参数。确认这一点并在报告里写出依据（函数行号＋一句话）；若不成立，按同样方式处理。

**启动时序要确认**：上游带深链参数（如 `year`）加载时会立即 arm URL 同步。确认研究层读 `location.search` 时，上游还没改写过 URL。写出依据：读到的函数名和行号，或测试读数。

## 3. 问题二：地形开关与研究图层

**事实**：上游 `toggleTerrainMode()` 给 `grpRivers`（以及 `grpTerrain`）加 `is-hidden`。研究层的 `#grp-sam-research` 是插在 `grpRivers` 后面的兄弟节点，地形关闭时不会被隐藏。

**裁定（派发方已定，照此实现）**：研究图层**只听自己的开关**，与地形开关无关。需要保证：

| 地形 | 研究层开关 | 研究图层 | 被研究要素压制的旧河道 |
|---|---|---|---|
| 开 | 开 | 显示 | 隐藏（现有 supersession 行为） |
| 开 | 关 | 不显示 | 照常显示 |
| 关 | 开 | **显示**，且随年份／日期更新 | 随 `grpRivers` 一起隐藏 |
| 关 | 关 | 不显示 | 随 `grpRivers` 一起隐藏 |

要查清的风险：研究要素是在被包装的 `_buildTerrainRivers` 里重绘的。地形关闭时，上游还会不会在改年份时调用 `_buildTerrainRivers`？
- **会** ⇒ 第三行自然成立，写出依据即可。
- **不会** ⇒ 研究图层会停在旧年份。改法：在研究层内另挂一个不依赖地形的年份刷新点，只能包装原型方法，不能改 `app.js`。挂在哪个上游方法上、为什么选它，都写进报告。

hover／命中：上游有一处按 `grpRivers` 是否 `is-hidden` 判断 hover（`grep -n "contains('is-hidden')"`）。确认它不影响研究图层的点和标签。研究图层本来就没有 hover 交互的话，写一句说明即可。

## 4. 问题三：旧水系清单漂移

- 用 P0a-1 的同一条命令重新生成：
  `node scripts/sam/hydro_inventory.js --geo js/china_geo_data.js --map js/map_data.js --out-dir docs/sam/audit --margin-deg 0.5`
- **生成前**先把三份旧产物复制到 `docs/sam/audit/_pre_s1/`，这个目录不提交。生成后逐项比对，只报事实：
  1. entry 条数前后各多少；
  2. 哪些 `legacy_id` 消失、新增、指纹改变（全部列出，不截断）；
  3. 对每条指纹改变的 entry，说明改了什么（坐标点数、名称、区间……），并对照 §1 列出的上游提交找出处。
- 判定：
  - 改变只落在研究区（黄河、淮河、运河及其 supersedes 目标）以外 ⇒ 接受新清单；
  - 只要碰到 `data/sam/**` 里任何 `supersedes` 指向的 `legacy_id` ⇒ **停下，不接受**，在报告里写成 BLOCKING。
- R2-04 测试的期望值随新清单走，不改测试逻辑。`R2-04 coordinate-only drift must fail` 那条反例必须仍然失败。

## 5. 测试（必须能失败）

在 `scripts/sam/research_layer_core.test.js`（或新建 `scripts/sam/research_layer_url.test.js`）补：

1. **URL 往返**：
   - 用假的 `location`／`history` 跑「研究模式启动 → 调原 `_urlStateParams` 的替身 → 包装后结果含 `research`／`research_sources`／`research_date`」；
   - 「非研究模式 → 包装后与原函数输出逐字相同」；
   - 「研究参数含 `..` 或外域 ⇒ 启动即拒绝，包装不会把它加回 URL」。
2. **地形真值表**：§3 表的四行，每行一个断言（DOM 替身即可）。
3. **变异自检**：把包装里「加回研究参数」那一行删掉，确认第 1 条测试失败；把 §3 的刷新点去掉（如果你加了），确认第 2 条第三行失败。把变异命令和失败输出贴进报告，然后恢复。

全部跑一遍，贴每套的末行和退出码：
- `node scripts/sam/georef_core.test.js`
- `node scripts/sam/hydro_inventory.test.js`
- `node scripts/sam/research_layer_core.test.js`（及新建的测试文件）
- `node scripts/sam/validate_research.test.js`：只读沙盒下 `mkdtemp` 可能 EPERM，报出原文即可。workspace-write 下应能跑。
- `node scripts/validate_atlas.js --fast` 与 `node scripts/sync_version.js --check`：上游的检查，确认 fork 的脚本没碍着它们。
- `node scripts/sam/validate_research.js --data data/sam/huanghe1938/fronts_place_anchor_v1.geojson --sources data/sam/huanghe1938/fronts_sources.json --legacy-inventory docs/sam/audit/hydro_inventory.json`：须 0 error。

## 6. 文档

1. `docs/sam/UPSTREAM_TRACKING.md`：
   - 按 §E 模板追加「2026-11-03 intake」一节，填 Snapshot、HEAD、真实增量 89、force-push 说明、A–F 分组。
   - 分组只按提交标题归类，不改代码；条目多时可按 PR 号范围合并成行。
   - Decision 写 `absorb（整体同步）＋研究层适配（本单）`。
   - 另起一小节「上游新能力，待单独决定是否用于研究」，只列不评，各一行：GeoJSON 导出 #131、MCP／WebMCP #174、搜索分类 #206、多地点事件 #210、embed #219、事件播放 #235。
   - §A 里「首次核验 0/0」那句保留原样，旁边加注「上游 2026-11 前曾 force-push，见本次 intake」。
2. `docs/sam/UPSTREAM_FEEDBACK.md`：
   - 对每条 UF 在新 HEAD `7c5cfe3` 上重新核实。
   - 状态改为「已复核（7c5cfe3）」，并写一句结论：仍成立／已被上游修正（附提交）／行号已变（给新行号）。
   - 不新增条目。新发现的上游问题写进 S1_REPORT 的「候选」节，由派发方决定是否收录。

## 7. 报告

写 `docs/sam/audit/S1_REPORT.md`（中文）：
- 交付物清单
- §2–§4 各问题的依据（函数名＋行号）与改法
- 漂移比对全表
- 测试输出原文（末行＋退出码）
- 变异自检
- 白名单外想改但没改的地方
- 本单数字与实测的出入

最后一行写 `S1 DONE`。
