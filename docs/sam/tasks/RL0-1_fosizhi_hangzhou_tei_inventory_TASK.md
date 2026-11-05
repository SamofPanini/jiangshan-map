# 任务单 RL0-1｜DILA 寺志典藏：杭州相关 20 部 ZIP 的只读清点（TEI 有无与标注层级）

- task_id：`jsm-rl01-fosizhi-inventory`
- 派发方：Sam's Agent(Opus-5.5)；执行：Codex（Terra）
- 建立：2026-11-05；状态：active
- 上位：[RELIGION_LAYER_PLAN.md](../RELIGION_LAYER_PLAN.md) §3.1（R0 回写核验遗留）；契约草案 [RESEARCH_ENTITIES_PROFILE.md](../RESEARCH_ENTITIES_PROFILE.md)。本单属 R0 收尾，**不产生研究数据**、不进 registry。

## 0. 开工前必读

1. 仓库根 `AGENTS.md`：§1 任务单优先与报告格式、§2 文件边界、§3 器械 fail-closed、§7 第三方文献与缓存。
2. 本单白名单外的文件一律不改；需要改时停下报告。
3. 不 commit / push；不建任何 schedule 或 watch job。

## 1. 目的

GPT Deep Research 回写称，DILA「中国佛教寺庙志数位典藏」中与杭州相关的寺志约 20 部，其中**确认带人地时标注 TEI 的至少 g017、g032、y109**，其余「有全文／影像」但未逐包核验；站内说明还有「13 部」与「15 部」两种口径。R2 试点（南宋临安五山）要决定哪些寺志能直接解析、哪些只能 OCR，前提是逐包确认：

- 包里有没有 TEI；有的话，标注到什么层级（只有分页分行，还是标了人名、地名、时间，有没有指向 DILA 权威库的 ID）；
- 包里自带的 README、COPYING 对许可是怎么写的（这直接关系方案 §3 的未决问题：CC BY-SA 是否覆盖影印底本影像）；
- 页码锚的形式（例如 `g032p0651`），能否作为 claim 的 locator。

## 2. 派发方读数（2026-11-05 主会话实测；你实测有出入就报，不要去凑）

- 下载页：`https://buddhistinformatics.dila.edu.tw/fosizhi/`；包的地址形如 `https://buddhistinformatics.dila.edu.tw/fosizhi/archives/<文件名>.zip`；同目录下另有 `gazetteerCatalog.xml`、`gazetteerKML.kml`。
- 服务器支持 Range：HEAD 返回 `Accept-Ranges: bytes`，`-r 0-99` 返回 206。
- 20 个包、合计 **1,369,422,949 字节**（各包 Content-Length 见下表；Last-Modified 抽查的两包都是 2020-12-24）：

| 文件 | 字节 |
|---|---|
| g007_wulinfanzhi.zip | 163348993 |
| g015_dazhaoqinglusizhi.zip | 58586734 |
| g016_chijianjingcisizhi.zip | 274742398 |
| g017_yucenshanhuiyingaolihuayanjiaosizhi.zip | 42082847 |
| g018_fenghuangshanshengguosizhi.zip | 12825391 |
| g019_wulinliansizhi.zip | 83102719 |
| g020_longjingjianwenlu.zip | 73352481 |
| g021_wulinlingyinsizhi.zip | 87451519 |
| g022_zengxiuyunlinsizhi.zip | 45237467 |
| g023_xuxiuyunlinsizhi.zip | 75876239 |
| g024_hangzhoushangtianzhujiangsizhi.zip | 70426348 |
| g025_yunjushengshuisizhi.zip | 44509939 |
| g026_hupaodinghuisizhi.zip | 29138139 |
| g027_yunqijishi.zip | 28743201 |
| g028_longxingxiangfujietansizhi.zip | 77283049 |
| g029_xixifanyinzhi.zip | 39938954 |
| g030_chongfusizhi.zip | 16997255 |
| g031_xuchongfusizhi.zip | 4595430 |
| g032_jingshanzhi.zip | 125964288 |
| y109_jingshanji.zip | 15219558 |

- 用 Range 只读中央目录，g017 的结构是：成员 288 个（jpg 281、xml 3、txt 3、rng 1）。非图像成员有 `COPYING.txt`（21,018 字节）、`g017.tei.xml`（373,732）、`g017.mets.xml`（376,533）、`DILA_fosizhi_TEI_schema.rng`（293,559）、`DILA_fosizhi_TEI_ODD.xml`（23,470）、`README.txt`（4,120）、`g017.txt`（158,424）。
- 这 20 部的范围来自 DR 回写，**并非都已确认属于杭州**，例如 g030、g031 崇福寺志的所在地没有核实。要用 `gazetteerCatalog.xml` 的著录逐部判定，判不出来的写「未判定」。

## 3. 交付物（白名单）

| 路径 | 改动 |
|---|---|
| `scripts/sam/fosizhi_zip_inventory.py` | 新建：清点器（python3 标准库） |
| `scripts/sam/fosizhi_zip_inventory_test.py` | 新建：测试（`python3 -I scripts/sam/fosizhi_zip_inventory_test.py`，用 `unittest`） |
| `docs/sam/audit/RL0-1_fosizhi_inventory.json` | 新建：机读结果 |
| `docs/sam/audit/RL0-1_REPORT.md` | 新建：报告（三段式＋汇总表） |
| `docs/sam/files/fosizhi/<id>/` | 新建：**只放非图像成员**（tei.xml、mets.xml、txt、README、COPYING、rng、ODD）以及 `gazetteerCatalog.xml`。这个目录由 `.git/info/exclude` 排除，不进 git |

### 3.1 清点器 `fosizhi_zip_inventory.py`

- **参数全部显式**：`--ids <逗号分隔的包文件名，或一个列表文件>`、`--base-url`、`--catalog <gazetteerCatalog.xml 的本地路径>`、`--cache-dir`（即 `docs/sam/files/fosizhi`）、`--out <json>`。缺参数或出现未知参数，一律非零退出。
- **只用 HTTP Range 读取**：先 HEAD 拿 `Content-Length`、`Last-Modified`、`Accept-Ranges`，再用 Range 读中央目录，列出成员，只取非图像成员。**禁止整包下载**。服务器对任何一个包不支持 Range（无 `Accept-Ranges: bytes`，或 Range 请求不返回 206）时，就停下这个包并记为 `blocked_no_range`，**不退回整包下载**。
- 图像成员（扩展名为 jpg/jpeg/tif/tiff/png）**一律不读取内容**，只计数、合计字节数。
- 非图像成员单个超过 20 MB：不取，记为 `skipped_too_large` 并停机报告。
- 每取一个成员都做两件事：用 zip 自带的 CRC32 校验，再计算 sha256。CRC 不符就抛错，不得写空结果。
- **开口先自报**：每个包打印 URL、Content-Length、Last-Modified、成员数；每个取下的成员打印路径、字节数、sha256。
- 解析失败（ZIP 结构坏、XML 解析不了）要抛错并记进结果，**不得返回空集合**。
- 请求节制：包与包之间顺序执行，不并发；每次请求间隔至少 1 秒；失败重试至多 2 次。

### 3.2 每个包要记录的字段（写进 JSON）

1. `zip`：文件名、URL、content_length、last_modified、accept_ranges、range_status（`ok` / `blocked_no_range`）。
2. `members`：成员总数；按扩展名计数；图像合计字节；非图像成员清单（路径、字节、CRC32、sha256、本地缓存路径）。
3. `tei`：有没有 `*.tei.xml`。有的话记录：
   - 根元素与命名空间、`teiHeader` 里的题名和版本说明（原样，≤80 字）；
   - **元素计数前 40 名**（带命名空间），不要预设标签名；
   - 人名、地名、时间类元素是否存在、各有多少；判断依据是出现了哪些元素名，写出来；
   - 这些元素上出现的属性名及计数（如 `key`、`ref`、`when`），以及**取值样例 3 个**（只给 ID 样式，例如 `PL000…`、`A000…`，不抄正文）；
   - 分页与分行标记（`pb`、`lb` 等）的属性形式与样例 3 个，例如 `n="…"`、`xml:id="g032p0651"`；
   - 文本主体字数（去掉标签后的字符数）。
4. `mets`：有没有 METS；有的话记录 `fileGrp` 的种类与文件数。
5. `license_files`：README、COPYING 里**与许可、权利、来源有关的句子**原样摘出（每包合计 ≤600 字），并概括：许可名称、是否提到影印底本或出版社的权利、是否区分文字与影像。
6. `catalog`：在 `gazetteerCatalog.xml` 里对应条目的题名、编者、版本或刊年、所在地著录（原样），以及「是否杭州」（`yes` / `no` / `未判定`）和依据。

### 3.3 测试 `fosizhi_zip_inventory_test.py`（必须包含能失败的负例）

- 在内存里构造一个合成 ZIP（含 1 个 jpg、1 个 tei.xml、1 个 txt），用「把字节串当 Range 源」的适配器跑清点逻辑。断言：图像成员没被读取内容，非图像成员的 sha256 正确。
- 负例：
  1. 缺少 `--out` 时非零退出；
  2. 未知参数时非零退出；
  3. Range 源返回整段而非 206 时，记为 `blocked_no_range`，且不会整包读取；
  4. 篡改一个成员字节导致 CRC 不符时抛错；
  5. tei.xml 不是合法 XML 时抛错，而不是返回空计数。

## 4. 验证（报告里逐项附真实输出）

1. `python3 -I scripts/sam/fosizhi_zip_inventory_test.py`：全部通过（附输出）。
2. 实跑 20 个包（附命令与清点器开头的自报输出；输出可以只截每包的头 3 行，但**标识信息不截断**）。
3. 统计本次实际下载的总字节数（HTTP 层累计），应远小于 1.37 GB；附数字。
4. `node scripts/validate_atlas.js`：exit 0。
5. `git status --porcelain` 只出现白名单内的路径（`docs/sam/files/` 应当不出现，因为已被排除）。若出现其他改动，照实列出，不要动它们。

## 5. 停机条件

- 任一包不支持 Range ⇒ 该包记为 `blocked_no_range` 后继续下一个；全部 20 包都不支持 ⇒ 停下报告。
- 需要整包下载、读取图像，或需要安装依赖 ⇒ 停下报告。
- 站点返回 403、429，或连续超时 ⇒ 停下报告，不换途径绕过。
- 需要改白名单外的文件 ⇒ 停下报告。

## 6. 报告（`docs/sam/audit/RL0-1_REPORT.md`）

三段式：交付物清单 / 验证结果（逐项）/ 规格偏差（无则写「无」）。另附：

- **汇总表**，每部一行：id｜题名（目录著录）｜是否杭州｜有 TEI｜人名、地名、时间标注（有/无＋计数）｜有无权威库 ID 属性｜页码锚形式｜许可文件要点。
- 回答：站内「13 部 / 15 部有 TEI」的口径，在这 20 部里实测对应几部？
- 回答：README、COPYING 有没有说明**影印底本影像**的权利来源？原句摘录（≤200 字）。
- **「单里给出的数与你实测有出入吗？」** 有就报，不要去凑。
- 建议区（单外发现写在这里，不要顺手做）。
- 报告最后一行写：`RL0-1 DONE`。
