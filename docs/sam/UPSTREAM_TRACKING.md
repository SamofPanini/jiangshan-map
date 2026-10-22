# 江山时序｜Upstream Intake / Selective Sync Register
> 初始审计日期：2026-10-22 JST；状态：**人工 review 规范，非已启动的监控/自动 merge**。
> 上游：[DeanChensj/jiangshan-map](https://github.com/DeanChensj/jiangshan-map)；Fork：[SamofPanini/jiangshan-map](https://github.com/SamofPanini/jiangshan-map)。
> 路线图正典：[ROADMAP.md](./ROADMAP.md)（2026-10-23 起；旧计划 [HISTORICAL_GIS_EXTENSION_PLAN.md](./HISTORICAL_GIS_EXTENSION_PLAN.md) 仅作背景）。

## A. Frozen baseline（严格区分历史基线与现况）
- 本 fork 创建后首次核验时 upstream/main 与 fork/main 完全一致：`a9cd67c3c4c5eef5902d31104df9b5a7ec83aa0e`，ahead/behind = 0/0（**仅指 2026-10-22 首次核验时刻**）。
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
