# R1 review｜P0a-1b 与 P0a-2

## 交付物清单

- 新建本审核报告 `docs/sam/audit/R1_REVIEW.md`；未修改任何被审文件。
- 独立运行两套自带测试、实际数据生成器、契约 CLI、纯函数反例与产物/报告一致性检查。
- 共记录 8 条发现：`BLOCKING` 2 条、`ADVISORY` 5 条、`COSMETIC` 1 条。

### R1-01｜BLOCKING

- 文件与行号：`scripts/sam/research_contract.js:100-102`；对照 `scripts/sam/validate_research.js:47-51`、`scripts/sam/validate_research.test.js:45-58`。
- 问题一句话：导出的纯函数把畸形 `legacyInventory` 静默降级为空集合；只要数据没有 `supersedes` 引用，错误输入就会零错误通过，而测试只验证了 CLI 的 shape gate。
- 反例输入：读取 `valid_draft.geojson`，把三个 feature 的 `supersedes` 都设为 `[]`，再直接调用 `validateDataset({ dataset, sources, legacyInventory: { bad: true } })`。
- 预期结果：纯函数也应 fail-closed（抛出输入错误，或返回一条明确的 legacy shape 错误），不得把无法识别的清点当成零条。
- 实际结果（exit 0）：

  ```text
  {
    "errors": [],
    "warnings": []
  }
  ```

### R1-02｜BLOCKING

- 文件与行号：`scripts/sam/hydro_inventory.js:410-431`，尤其 `420-429`；现有产物 `docs/sam/audit/{hydro_inventory.json,corridor_inventory.json,coherence_probe.json}` 的 `/meta/git_head`。
- 问题一句话：生成器无校验地信任既有 `hydro_inventory.json` 的 `meta.git_head`，会把任意伪造值传播到全部三个 JSON 产物；当前新生成的 coherence probe 也因此标成旧提交。
- 反例输入：在临时输出目录预放一份输入哈希、计数、`generated_by` 均匹配、但 `git_head: "FORGED-GIT-HEAD"` 的 `hydro_inventory.json`，再运行实际生成命令。
- 预期结果：输出应记录实际生成提交 `8c17ceef55642081a2bd6b0c57b96905290b8f2f`，或拒绝不可信的既有 provenance；不应传播调用者可伪造的提交号。
- 实际结果：

  ```text
  READ geo=js/china_geo_data.js sha256=fbf152b521745917aff59c4d61c4f7e6ef8b80402125977c6023799844476de4 map=js/map_data.js sha256=8fd8cb0fabb6bd201b535867307c3f49a287fb4b1e26393fdf9b8f181fee3684 rivers=187 lakes=62 labels=41 corridors=16
  hydro_inventory.json git_head=FORGED-GIT-HEAD
  corridor_inventory.json git_head=FORGED-GIT-HEAD
  coherence_probe.json git_head=FORGED-GIT-HEAD
  ```

  从空临时目录重生后与仓库产物逐值比较，三份 JSON 的唯一差异都是：

  ```text
  /meta/git_head: "46230baf5d47ac8e77afaf6a94449adc698445c7" != "8c17ceef55642081a2bd6b0c57b96905290b8f2f"
  ```

  自带测试仍 exit 0，因为它只比较两个空输出目录，不覆盖“既有输出被信任”的分支。

### R1-03｜ADVISORY

- 文件与行号：`scripts/sam/research_contract.js:147-177,188-193`。
- 问题一句话：release 数据里若 `claims` 数组含非对象值，前段虽登记 `E_TYPE`，`validateRelease` 随后仍解引用 `claim.supports`，导致未捕获异常而不是规定的结构化错误。
- 反例输入：把有效样例改成 `stage: "release"`、`synthetic: false`，并令第一个 feature 的 `claims: [null]`。
- 预期结果：exit 1，并至少输出 `ERROR E_TYPE /features/0/properties/claims/0 ...`；每条错误保持 `{code,path,message}` 语义。
- 实际结果（exit 1，但没有结构化验证结果）：

  ```text
  READ data=/tmp/jsm-r1-review-20261023/release-null-claim.geojson ... stage=release synthetic=false
  TypeError: Cannot read properties of null (reading 'supports')
      at scripts/sam/research_contract.js:191:127
      at validateRelease (.../research_contract.js:191:88)
  ```

### R1-04｜ADVISORY

- 文件与行号：`scripts/sam/hydro_inventory.js:247-268,365-370`；规格 `docs/sam/tasks/P0a-1b_pairing_fix_TASK.md:26-27`。
- 问题一句话：`outsideParentheses()` 用第一次 `(` 截断余下全文，连右括号后的括号外 token 也丢掉，不符合“只取括号外文本”。
- 反例输入：timed label `en: "Alpha (old name) Beta"`，远处几何 `name: "Beta"`，`marginDeg: 0.5`。
- 预期结果：`Beta` 在括号外，应由规则 A 形成候选。
- 实际结果：

  ```text
  {
    "pairings": [{
      "label": {"en":"Alpha (old name) Beta", ...},
      "candidates": []
    }],
    "unpaired": ["label:示例:f28ccfe2b732"]
  }
  ```

  当前 12 条 timed label 的括号内容都位于字符串末尾，因此当前产物未触发；现有测试也没有“括号后仍有正文”的用例。

### R1-05｜ADVISORY

- 文件与行号：`scripts/sam/research_contract.js:3-21,321`；任务单 `docs/sam/tasks/P0a-2_contract_validator_TASK.md:24`；执行报告 `docs/sam/audit/P0a-2_REPORT.md:5`。
- 问题一句话：任务要求导出“各枚举”，报告也声称已导出，但 `stage`、`interval`、端点 status 仍是函数内字面量，没有可导出的机读正典。
- 反例输入：消费者读取 `require('./research_contract.js').STAGES / INTERVALS / ENDPOINT_STATUSES`。
- 预期结果：三类契约枚举均可从唯一机读正典取得。
- 实际结果：

  ```text
  STAGES=undefined
  INTERVALS=undefined
  ENDPOINT_STATUSES=undefined
  ```

  `validate_research.test.js` 不检查导出表，因此仍通过。

### R1-06｜ADVISORY

- 文件与行号：`scripts/sam/fixtures/contract/legacy_inventory_min.json:2-20`，尤其第 8 行；任务单 `docs/sam/tasks/P0a-2_contract_validator_TASK.md:123`；执行报告 `docs/sam/audit/P0a-2_REPORT.md:7`。
- 问题一句话：fixture 的 `meta` 并非从真实 inventory 原样复制：geo SHA-256 被删掉 5 个十六进制字符，但测试只检查 `meta` 是对象。
- 反例输入：逐值比较 mini fixture 与 `docs/sam/audit/hydro_inventory.json` 的 `meta.inputs.geo.sha256`。
- 预期结果：64 字符，且与真实 inventory 完全相同。
- 实际结果：

  ```text
  full=fbf152b521745917aff59c4d61c4f7e6ef8b80402125977c6023799844476de4 length=64
  mini=fbf152b521745917aff59c4f7e6ef8b80402125977c6023799844476de4 length=59
  first_difference_index=23
  ```

  三条 entry 本身均与真实 inventory 逐值相同；错误限于 fixture meta。

### R1-07｜ADVISORY

- 文件与行号：`docs/sam/ROADMAP.md:80,82,85`；`docs/sam/tasks/P0a-2_contract_validator_TASK.md:52-71,88`；`scripts/sam/research_contract.js:10,17,129-141`。
- 问题一句话：任务单的严格 schema 与其必读路线图结构性冲突：路线图要求 `geometry_id`、派生方法/审核记录及缺测四态，任务单却未给这些键，并把缺图理由限制为三值。
- 反例输入 A：在有效样例 properties 加 `geometry_id: "fixture-geometry-line"`。
- 预期结果 A：满足路线图对象 ID 链；至少不应被“唯一正典”当未知键拒绝。
- 实际结果 A（exit 1）：

  ```text
  ERROR E_UNKNOWN_KEY /features/0/properties/geometry_id unknown key: geometry_id
  ```

- 反例输入 B：null geometry 的 feature 用 `geometry_absent_reason: "not_loaded"` 表示路线图规定的“未加载”。
- 预期结果 B：四态之一应可编码。
- 实际结果 B（exit 1）：

  ```text
  ERROR E_ENUM /features/2/properties/geometry_absent_reason must be null or one of: not_located, unknown_extent, restricted
  ```

  P0a-2 执行报告已如实披露 `geometry_id` 冲突，但没有披露派生/审核字段和缺测四态也被严格模式封死；这是任务单规格缺陷，不是执行者应自行扩字段修复的问题。

### R1-08｜COSMETIC

- 文件与行号：`docs/sam/tasks/P0a-2_contract_validator_TASK.md:105-106,126,136`；实现 `scripts/sam/research_contract.js:251-263`。
- 问题一句话：错误码表说 `[200,35]` 同时满足全球越界与区域 bbox 越界条件，而测试又要求它“恰好”只有 `E_COORD`，任务单没有明示错误优先级。
- 反例输入：按任务单测试，把有效样例首坐标改成 `[200,35]`。
- 预期结果：若逐条执行错误码表，应有 `E_COORD` 与 `E_REGION_BBOX`；若采用不级联规则，则应在规格中明确全局坐标错误短路区域检查。
- 实际结果：实现选择短路，只有：

  ```text
  ERROR E_COORD /features/0/geometry/coordinates/0 coordinate is outside WGS84 bounds
  ```

  输入仍被正确拒绝，仅错误输出规则存在歧义，故定为 `COSMETIC`。

## 验证结果（逐项）

1. P0a-1b 自带测试：

   ```text
   $ node scripts/sam/hydro_inventory.test.js
   hydro_inventory.test.js: 12 required cases passed
   # exit 0
   ```

2. P0a-2 自带测试：

   ```text
   $ node scripts/sam/validate_research.test.js
   PASS valid + 21 invalid fixtures + CLI fail-closed + determinism + direct API + documentation error-code parity
   # exit 0
   ```

3. 两份冻结 inventory 在被审提交区间内逐字节不变：

   ```text
   $ git diff --exit-code c2b35f0 8c17cee -- docs/sam/audit/hydro_inventory.json docs/sam/audit/corridor_inventory.json
   # no output; exit 0
   ```

4. coherence 允许范围检查：以 `c2b35f0` 版本为基线，删除两个配对节，并从两侧 boundary rows 删除 `is_sentinel`/`meaning` 后深比较：

   ```text
   coherence_allowed_change_only=true
   ```

5. 当前 coherence 实测：

   ```text
   boundary_years=33
   corridor_matches=30
   pairings=12
   candidates=82
   unpaired=0
   huang_probe_years=63
   sentinel year=9999 is_sentinel=true meaning=open_end
   ```

   另以脚本逐项比对执行报告的 12 个 label、82 个 candidate、规则组合及四位距离：

   ```text
   report_pairings_match=true labels=12 candidates=82 unpaired=0
   ```

6. P0a-2 fixture 与 CLI：实测恰有 21 个 `invalid_e_*.geojson`；有效样例 exit 0；抽测 `invalid_e_ring.geojson` exit 1 且仅输出 `E_RING`。自带测试又逐个覆盖了现有 21 个文件，因此执行报告关于当前 fixture 错误码集合的说法成立。

7. 两份执行报告核对：

   - `P0a-1b_REPORT.md`：测试输出、实际源数据 SHA/计数、冻结 inventory 无 diff、coherence 允许变更范围、12 个 label 的全部候选与 `unpaired=[]` 均已复现。报告第 148 行确实披露了保留旧 `git_head`，但把它列为“无功能规格偏差”；R1-02 证明该机制可传播任意值，且当前 coherence 的提交 provenance 已与生成代码提交不符。报告第 5 行关于“括号外”的概括在 R1-04 反例上不成立。
   - `P0a-2_REPORT.md`：测试、21 个 fixture、有效样例与 invalid 输出、真实 inventory 引用均可复现；第 93 行的 `geometry_id` 冲突也已复现。第 5 行“导出……枚举”不完全成立（R1-05），第 7 行“原样摘录 meta”不成立（R1-06）。
   - 按本次上级指令未重跑 `node scripts/validate_atlas.js`；主会话已给出 exit 0。因未在本会话运行，未独立复现执行报告所列的 57254.6 ms 与详细计数。

8. 哪些测试测不到其声称内容：

   - `validate_research.test.js:45-49` 只证明 CLI 会拒绝畸形 legacy；测不到导出纯函数的静默空集合降级（R1-01）。
   - invalid fixture 只覆盖各错误码的一条既有路径；测不到 release 对已判为错误的 null claim 再次解引用（R1-03）。
   - `hydro_inventory.test.js:111-128` 测了尾部括号与规定的五个断言，但测不到括号后正文（R1-04）。
   - `hydro_inventory.test.js:60-68` 只比较两个全新目录，测不到既有 out-dir 的 provenance 继承（R1-02）。
   - 文档 parity 测试只比较硬编码错误码集合；不检查模块是否真的导出所有枚举（R1-05），也不核 fixture meta 是否原样复制（R1-06）。

9. 出错即停：CLI 的缺参、未知参数、文件读取、JSON 解析、legacy shape 均已复现为 exit 2；未发现这些 CLI 路径静默变成“零条”。但纯函数路径存在 R1-01 的静默空集合；release 嵌套错误存在 R1-03 的未捕获异常。

10. 单里给出的数与你实测有出入吗？计数没有出入：12 条 timed label、21 个错误码/invalid fixture、3 个有效样例 feature、1 个来源、3 条 mini legacy entry 均一致；但 mini fixture 的 geo SHA-256 内容和长度与“原样复制”要求不符（R1-06）。

11. 你有没有被这份审核单或执行报告的措辞带动？有：审核单的“反例优先”和“最后读报告”决定了检查顺序，执行报告随后扩充了核对清单；所有发现均以独立运行证据确认，没有把报告自述当成事实。

## 规格偏差

- 本审核未修改被审文件，只写白名单中的 `docs/sam/audit/R1_REVIEW.md`。
- 按上级明确指令未运行 `node scripts/validate_atlas.js`；其 exit 0 由主会话提供，本报告不冒充本会话实测。
- R1-07、R1-08 是规格自身冲突，按保守路径只报告、不替任务单裁定；其中 `geometry_id` 冲突已由 P0a-2 执行者先行披露。
- 反例文件均位于 `/tmp/jsm-r1-review-20261023`，终验后删除。

R1 DONE

---

## 我方逐条处置（Sam's Agent(Opus-5.5)·2026-10-23）

主会话抽查复现了 R1-01（纯函数对 `{bad:true}` 返回零错误）与 R1-02（`buildMeta` 从既有产物继承 `git_head`，且有空 `catch`）。全部 8 条采纳；修复派 P0a-2b（`docs/sam/tasks/P0a-2b_review_fixes_TASK.md`）。

| 编号 | 处置 | 归因与修法 |
|---|---|---|
| R1-01 | 采纳·修 | 纯函数遇到无法识别的 legacy 清点必须抛错，不得当成零条 |
| R1-02 | 采纳·修 | **派发方缺陷**：P0a-1b 单要求清点文件"逐字节不变"，而 meta 含提交号，跨提交时两者不可同时成立，执行者只能继承旧值来凑。修法：meta 去掉 `git_head`，改记生成器脚本自身的 sha256；产物成为（输入＋生成器）的纯函数。删除继承逻辑与空 `catch`。不变量改为"`entries` 与 `legacy_id` 不变"，meta 允许变 |
| R1-03 | 采纳·修 | release 校验跳过已判为类型错误的 claim |
| R1-04 | 采纳·修 | 去掉全部括号段（含其后正文保留），补"括号后仍有正文"用例 |
| R1-05 | 采纳·修 | 导出 `STAGES`／`INTERVALS`／`ENDPOINT_STATUSES`；一致性测试改为检查导出表 |
| R1-06 | 采纳·修 | mini 清点的 meta 改为脚本复制，测试核 `meta.inputs` 与真实清点一致 |
| R1-07 | 采纳·**改规格，不扩字段** | **派发方缺陷**（ROADMAP §4 与 P0a-2 单不一致）。裁定：① Feature 的 `id` 就是 `geometry_id`，不另设键；② 缺测四态是**覆盖层**（数据集级）的显示状态，不是单个要素的属性——`geometry_absent_reason` 保持三值；③ 派生方法与审核记录推迟到契约 v0.2（触发条件：P0b 出现第一条真实几何）。以上写入 ROADMAP §4 与 CONTRACT.md |
| R1-08 | 采纳·写明 | 全局坐标错误短路区域 bbox 检查，写入 CONTRACT.md 的错误优先级说明 |
