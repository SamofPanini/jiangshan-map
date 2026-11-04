# 江山时序｜Upstream Intake / Selective Sync Register
> 初始审计日期：2026-10-22 JST；状态：**人工 review 规范，非已启动的监控/自动 merge**。
> 上游：[DeanChensj/jiangshan-map](https://github.com/DeanChensj/jiangshan-map)；Fork：[SamofPanini/jiangshan-map](https://github.com/SamofPanini/jiangshan-map)。
> 路线图正典：[ROADMAP.md](./ROADMAP.md)（2026-10-23 起；旧计划 [HISTORICAL_GIS_EXTENSION_PLAN.md](./HISTORICAL_GIS_EXTENSION_PLAN.md) 仅作背景）。

## A. Frozen baseline（严格区分历史基线与现况）
- 本 fork 创建后首次核验时 upstream/main 与 fork/main 完全一致：`a9cd67c3c4c5eef5902d31104df9b5a7ec83aa0e`，ahead/behind = 0/0（**仅指 2026-10-22 首次核验时刻**）。 上游 2026-11 前曾 force-push，见本次 intake。
- 此后 Sam 已开始单独新增 `docs/sam/` 研究文件；再次比较时必须重新获取两个远端 HEAD 和共同祖先。任何当时的 0/0 都不能继续当作实时状态。
- 2026-10-22 GitHub API 快照：上游 stars=808、forks=101、open issues=3；上游仓库创建于 2026-07-23；Sam fork 创建于 2026-10-22。数字不等于质量判断。
- 上游当前根许可 GPL-3.0；CHGIS/Hartwell 衍生历史数据另受原始条款限制，不能因为代码 GPL 就推定全部数据都可公开再分发。

## B. 已观察的 upstream 演化（以 GitHub commit / PR title 为证，不是独立运行验证）
| UTC 日期 | 变更主题 | 证据入口 | Fork 受影响面 |
| --- | --- | --- | --- |
| 10-18 | 隋唐边界修订、中英/拼音地名与 `atlasAPI` 地名解析、双语文档 | [#95](https://github.com/DeanChensj/jiangshan-map/pull/95), [#98](https://github.com/DeanChensj/jiangshan-map/pull/98) | 地理解析兼容性、旧链接 |
| 10-19 | 北洋/军阀时期六阶段地图，移动端人物轨迹显示 | [#103](https://github.com/DeanChensj/jiangshan-map/pull/103), [#104](https://github.com/DeanChensj/jiangshan-map/pull/104) | 时间轴、手机交互 |
| 10-20 | 104 人物索引与 Person Chronicles 统一、i18n 校勘 | [#105](https://github.com/DeanChensj/jiangshan-map/pull/105), [#107](https://github.com/DeanChensj/jiangshan-map/pull/107) | 人物行迹与搜索 |
| 10-21 | 东晋南北朝侨州改进、人物/史事回填、字体/SSR/WebP 性能优化 | [#112](https://github.com/DeanChensj/jiangshan-map/pull/112), [#114](https://github.com/DeanChensj/jiangshan-map/pull/114), [#116](https://github.com/DeanChensj/jiangshan-map/pull/116) | 疆域多边形、历史事件、渲染 |
| 10-22 | 地形覆盖渲染、年代归属及地点别名修复、人物补充、许可证切换至 GPL-3.0 | [#118](https://github.com/DeanChensj/jiangshan-map/pull/118), [#121](https://github.com/DeanChensj/jiangshan-map/pull/121), [#124](https://github.com/DeanChensj/jiangshan-map/pull/124), [#125](https://github.com/DeanChensj/jiangshan-map/pull/125) | 版本兼容、来源与许可审查 |

不能从短期 commit 密度推断未来 roadmap、发布日期或维护承诺。首次 fork 已包含以上改动，**上表不是当前尚待 cherry-pick 的差异列表**。

## C. 收到 upstream 更新时的处理分类
| 类别 | 默认判断 | 必须过的 Gate |
| --- | --- | --- |
| A · 修复/安全/性能 | 优先候选吸收 | diff 审阅、静态校验、核心功能回归 |
| B · 历史疆域、政区、地名、年代 | 条件吸收 | 具体史料或数据源、几何 diff、争议记录 |
| C · UI/人物/搜索/API/CLI | 兼容优先 | `?year`, `?place`, `?person`、中英 UI、移动端、`atlasAPI` |
| D · 水系/运河/湖泊/海岸 | 与独立 GIS 研究模型逐层合并 | provenance、许可、时序区间、地理精度与 source manifest |
| E · 数据编码/大型重构 | 先隔离试验 | 拆分文件影响面、全量 regression、性能、可回滚 |
| F · License/数据许可 | 必须独立审核 | 数据/代码许可逐层明确，否则暂缓 |

四种结论：`absorb`、`defer`、`reject`、`split`。**只做资料登记绝不意味着 coding、merge 或 release 已获授权**。

## D. 本地只读取证命令
```bash
git remote -v
# 若缺少 upstream remote 才执行：
git remote add upstream https://github.com/DeanChensj/jiangshan-map.git
git fetch origin && git fetch upstream
git rev-parse origin/main upstream/main
git log --oneline origin/main..upstream/main
git diff --stat origin/main...upstream/main
git diff --name-status origin/main...upstream/main
```
`..` 为提交集合差异；`...` 的 `git diff` 是 merge-base → 目标分支的差异。合并需另外检查 fork 独有文件、完整文件 diff 与 dirty tree，不可依赖一份 commit 列表直接 merge。建议通过隔离的 integration branch + PR，而非主分支自动合并。

## E. 每轮 intake 的审计记录模板
```text
Snapshot (JST):
Upstream HEAD:        Fork HEAD:
Ahead / behind:
New commits / changed paths:
A–F grouping:
Hydro/history data overlap:
Evidence + data-license review:
Actual tests / failures / screenshot diff:
Decision (absorb/defer/reject/split):
Rollback reference / reviewer:
```

本 fork 的独立文档放 `docs/sam/`，未来 GIS 数据优先放 `data/historical_hydro/` 与独立 adapter，避免直接修改 upstream 的巨型 VLQ 文件；若不得不改，先证明有测试覆盖与可回滚方案。不要自动用现代水道当作古代河道。

## 2026-11-03 intake

Snapshot (JST): 2026-11-03（任务单记录；本次复核 2026-11-04）
Upstream HEAD: `7c5cfe3`；Fork HEAD: `536560e`（合并后）
Ahead / behind: 旧历史 force-push，常规祖先比较不适用；原 `a9cd67c` 与 `4748ca2` 树相同。
New commits / changed paths: `4748ca2..7c5cfe3` 实测 89 commits、80 paths。

A–F grouping（仅据提交标题，交叉事项按标题主要内容归一类）：

- A：`f1520c2 fix(polygons): dissolve internal patchwork seams across 80 multi-piece polities and boost desert label contrast (#223)`；`b6d230f fix(test): include 885 CE in expected Tang isMapChange milestone list (#209)`；`839e785 perf(svg): simplify and tile province boundaries for D3D11 pan/zoom (#196) (#204)`；`7ac8ced perf(render): reuse intra-dynasty prefecture DOM, coalesce hover, and short-circuit raycasts (#199)`；`0fe64f8 fix(perf): eliminate zoom/scrub flicker and layout thrashing (#158)`；`81cda32 perf(atlas): eliminate SVG layout thrashing, coalesce typography passes, and lock label positions during zoom (#159)`；`e56d6a8 perf: reduce SVG camera layout work during interaction (#150)`；`c36a05c perf(scrubber): coalesce pointermove with rAF and skip unchanged years (#128)`

- B：`68b6db7 feat(lore): balance Southern Dynasties, Ten Kingdoms, Late Tang & Western Han events (#229)`；`4b9b89f feat(xihan): split 111-108 BCE expansion into 4 distinct chronological snapshots (#227)`；`5769e2c fix(atlas): fill Jiangxi commandery gap and unify Nanyue/Minyue polities across Qin-Han transition (#220)`；`3b7912d feat(atlas): complete missing milestone subjects and add -209/-207 Qin revolt snapshots (#218)`；`237158e feat(atlas): add 1901/1912 P0 milestones and fix Gengshi, Hexi, Five Dynasties &楚汉 map/lore gaps (#215)`；`be43092 feat(data): align 306 BCE Chu-Yue annexation and 885 CE late-Tang warlord milestones with map phase transitions (#208)`；`69196f8 fix(atlas): align Taiwan historical polity and prefecture names across all eras (#205) (#207)`；`d2cd7ff feat(tang): map Wu Zhou dynasty (690–705) and Shendu Luoyang capital (#198)`；`6290255 fix(map): enforce polygon containment for polity captions and refine Warring States anchors (#187)`；`98c5d2d feat(data): unify canonical contemporary settlement and pass names across all eras (#186)`；`58d40f5 feat(data): curate classic historical events, 9 figure trajectories, and frontier anchors (#185)`；`957511c fix(map): reconstruct Eastern Jin & Sixteen Kingdoms borders (Later Qin, Northern Wei, Southern Yan) (#183)`；`10389ee fix(zhanguo): align Warring States commandery (郡) progression with historical establishment years (#181)`；`3938d9f fix(map): naturalize polygon boundaries, Jiaozhou contour, and neighbor/region overlays (#180)`；`2bbb034 feat(lore): add Heirloom Seal of the Realm (传国玉玺) provenance easter egg (#177)`；`aa7161e fix(atlas): restore Liao and Jin northeastern and western historical frontiers (#167)`；`c064461 feat(dongjin,nanbei): align Sixteen Kingdoms snapshots (317-439 CE) and 420 CE transition (#164)`；`15ed58b feat(xijin): refine 280-304 causal timeline & spatialize Eight Princes and Five Hu context (#162)`；`d572168 fix(content): scope capital counts to the atlas and add Xuanzang's India stops (#161)`；`8a535c5 fix(zhanguo,qin,xihan): align Warring States with Zizhi Tongjian and upgrade Qin & Western Han high-res borders (#155)`；`39eca26 fix(atlas): refine Late Ming & Early Qing transition (1616-1683) (#152)`；`5789483 fix(qing): align snapshots, captions, milestones, and settlements with History of Qing (#151)`；`b6454c0 fix(ming): redraw Liaodong 1371-1388 as Ming and restore Hami Guard 1449-1513 (#149)`；`d734c8c fix(ming): align capitals, Later Jin seats, milestones, and the 1643 frame with History of Ming (#148)`；`4a15529 fix(song): align Northern & Southern Song territories, circuits, prefectures, and milestones with History of Song/Liao/Jin (#147)`；`5d7185d fix(atlas): close hollow Lop Nor/Qocho cavity and keyhole seam in Mongol Empire snapshots (#145)`；`bdcc59f fix(atlas): align Yuan borders, provinces, circuits, and late-Yuan warlords with History of Yuan (#144)`；`94fdf4c fix(sui-tang): align Sui-Tang transition, capitals, and High Tang protectorates with Zizhi Tongjian and Tangshu (#142)`；`476c742 fix(nanbei): align southern-northern borders, capitals, and milestones with Zizhi Tongjian and Nan/Bei Shi (#141)`；`026422c fix(atlas): align Western Jin, Eastern Jin & Sixteen Kingdoms with Book of Jin (#140)`；`046e724 fix(atlas): align Qin and Western Han borders and commanderies with Shiji and Hanshu (#138)`；`5795597 fix(sanguo,donghan): align 184-280 CE territories and milestones with Records of the Three Kingdoms (#137)`；`2915c6c fix(wudai): align 907-960 CE territories and milestones with Old History of the Five Dynasties (#134)`

- C：`7c5cfe3 feat(autoplay): event-driven timeline playback with 4x speed (#235)`；`b15bdf8 fix(timeline): add zero-widening compact label fallback for short dynasty bands (#222) (#233)`；`0842fac feat(embed): iframe embed mode via ?embed=1, documented in README only (#219)`；`a81c0d0 feat(milestones): add core high-school textbook milestones before Qing (#212)`；`340f224 feat(milestones): multi-site event anchors, slimmer diamonds, and mobile callout polish (#210)`；`7ce812b feat(search): rank regimes, figures/eras, places, and events by first-principles ontology (#206)`；`aaeb202 feat(chronicle): high-contrast trajectory casing, symmetric 3-person encounters, Gao Shi profile & MCP multi-route updates (#203)`；`d919b4f feat(polity): enrich regional regime profiles, ruler lineages, and event matching (#202)`；`eb91bda fix(chronicles): unify person trajectory ordering, site attribution, and journey punctuation (#201)`；`4ae4b90 fix(mobile): frame focused polities with the real portrait map aspect (#194)`；`9799f0f feat(url): mirror view state in the URL so refresh and share land on the same view (#191)`；`b66b846 fix(i18n): invalidate legend and person card cache keys after async English dictionary load (#190)`；`5a6e5a3 feat(polity): regime profiles, era-regime map focus and legend interactions (#189)`；`69712d2 fix(mobile): prevent collapsed chronicle capital occlusion and polish mobile overlays (#188)`；`f110644 fix(search): suppress remark-only city noise on era queries and surface matched remarks (#184)`；`d251a32 fix(search): deduplicate co-located same-year milestone and landmark events (#182)`；`e52a3e8 feat(person): add unified multi-person chronicle & dual-track spatial comparison (#179)`；`de0df24 fix(autoplay): pan camera to off-screen frontier milestones during playback (#176)`；`5942ffb fix(i18n): eliminate remaining Chinese leaks and broken quiz clues in English mode (#175)`；`bfb9197 docs(readme): link the author's story behind the project (#173)`；`66e28af feat: add stdio MCP server & WebMCP integration, refresh 8 README preview screenshots & sync docs/JSON-LD (#172)`；`05a630e feat(url): sync lang query param on locale toggle while preserving user-specified URL params (#170)`；`f3811dc fix(search,quiz,chronicle): fix fake person search hits, city-vs-era ranking, quiz clue corruption & stitched journey stops (#169)`；`120d1c1 feat(quiz): ramp deck difficulty 4-4-2 and move confirm/next to pin chip (#168)`；`10fdcae fix(persons): keep curated journey stops over colliding milestones (#166)`；`1042bf5 feat(ux): one-line first-visit guide with three ways in (#165)`；`21229e3 feat(ux): footer stop navigation for journeys; mark-and-confirm quiz with score rings (#163)`；`5973828 fix(i18n): audit all historical events and refine zh-Hant and en-US localization (#156)`；`742361e fix(genealogy): complete 349 modern prefecture-level cities & fix cross-dynasty admin boundaries (#157)`；`335bf9b fix(ui): strip parenthetical clutter from milestone place pills & clean 50 milestone sites (#153)`；`805de7f feat(i18n): add Traditional Chinese (zh-tw) support and dual-cell locale pill (#143)`；`1ac83ba feat(pwa): 添加 Web App Manifest 与主屏幕图标 (#135)`；`628b910 fix(ui): render PRC dynasty span as open-ended 1949— (#133) (#136)`；`daccf52 feat(timeline): add playback speed control (0.25x-2x) and full-width mobile scrubber (#132)`；`24f983e style(map): distinguish ancient neighbor polities from modern country watermarks (#130)`；`b80755c feat(ux): layered Escape overlay dismissal and trace/person teardown helpers (#129)`；`08fce25 feat(autoplay): show events while playing and move the playhead at constant speed (#126)`

- D：`6fcd786 fix(terrain): re-seat range/river labels after zooming back in; add 大漠, 葱岭, 巫山, 燕然山 (#217)`；`850c83e feat(terrain): name the classic frontier mountains and rivers when zoomed in (#216)`；`d12b4f2 fix(atlas): align pre-Tang northern, northeast, and southwest borders to natural terrain (#214)`；`eb0f1d6 perf(svg): merge prefecture border mesh, hide rivers with terrain, and suspend motion blur (#200)`；`9ded544 feat(terrain): label twelve frontier mountain ranges on zoom-in as lowest-priority captions (#146)`

- E：`f3bf25a feat(deploy): add Docker deployment (Dockerfile, docker-compose.yml, .dockerignore) + README docs (#228)`；`c4afe43 refactor(milestones): unify `.ep-place` pills to one-tap `📍 <site> ›` morphology (#211)`；`9709da2 refactor(atlas): make controller mixins load-order independent (#197)`；`6c95491 refactor(atlas): extract pinpoint quiz module (js/atlas_quiz.js) and unify controller script manifest (#195)`；`58cc9a0 perf(atlas): add per-asset SHA-256 cache hashes and --fast validation tier (#192)`；`f18259b feat(geojson): add GeoJSON export script and Leaflet demo for downstream use (#131)`

- F：无标题明确属于此类

Hydro/history data overlap: #146、#216、#217 涉及地形标注；Namhan 的 rank 漂移见 S1 报告。
Evidence + data-license review: 仅清单和提交标题审查，未对历史事实或数据许可作独立核验。
Actual tests / failures / screenshot diff: 详见 `audit/S1_REPORT.md`；无截图对比。
Decision (absorb/defer/reject/split): absorb（整体同步）＋研究层适配（本单）。
Rollback reference / reviewer: 合并前 fork `e8f122b`；验收由派发方负责。

### 上游新能力，待单独决定是否用于研究

- GeoJSON 导出 #131
- MCP／WebMCP #172
- 搜索分类 #206
- 多地点事件 #210
- embed #219
- 事件播放 #235
