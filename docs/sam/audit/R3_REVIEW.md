# R3 审核：P1-1 契约 v0.2（commit `7ef4f24`）

- 审核者：Codex GPT-6.1 Sol（high·只读）；派发 2026-10-24 23:42；thread_source `jsm/jsm-p1-1-r3/1`
- 依据：`docs/sam/tasks/P1-1_contract_v02_fronts_TASK.md`；问法＝「有没有反例／测试能否失败／规格本身的缺陷／是否被问法带动」
- 下面「审核原文」为执行者交付原文（日文，仅把本机绝对路径改成仓库相对路径），之后是主会话处置。

## 审核原文

交付物清单：`7ef4f24` の読み取り専用レビューです。**BLOCKING は3件（実行確認2件、コード読解1件）**です。ファイルは変更していません。

验证结果（逐项）：

- `research_layer_core.test.js`：exit 0。実出力：
  ```text
  PASS research-layer regressions: R2-01/R2-02/R2-03/R2-04/R2-05/R2-06/R2-07/R2-09 + intervals + real HYDRO_DATA
  ```
- `validate_research.test.js`：一時ディレクトリ作成で停止。`TMPDIR=/tmp` でも同じでした。
  ```text
  Error: EPERM: operation not permitted, mkdtemp '/tmp/jsm-p0a2-XXXXXX'
  ```
  ディスクに書く malformed-legacy CLI テスト部分だけをメモリ内で省いて再実行すると、残りは通過しました。**元のテスト全体が通過したとは扱っていません。**
- 新 demo の CLI 検証：exit 0、エラーなし、`W_LICENSE_UNKNOWN` が5件。実測は4 feature・5点で、報告書の数と一致しました。
- 以下の反例・変異テストはファイルを作らず実行しました。実ブラウザでの描画確認は未実施です。

规格偏差：質問の順に回答します。

1. **仕様どおりに動かない入力**

   以下の JSON 断片は、新 demo の先頭 feature の該当部分を置き換え、他の feature を除いて検証しました。

   **BLOCKING・実行確認：`flood_front` に Polygon が通る。**

   ```json
   {
     "geometry": {
       "type": "Polygon",
       "coordinates": [[[114,34],[115,34],[115,35],[114,34]]]
     },
     "properties": {
       "feature_type": "flood_front"
     }
   }
   ```

   - 仕様 §2.3：前線は「点または線」。この組み合わせは拒否すべきです。組み合わせ違反のエラーコード自体は仕様に指定がありません。
   - 実際：`errors: []`。テスト用DOMでも、`sam-research-polygon sam-evidence-schematic` の面と日付ラベルが生成されました。
   - 原因：幾何型と `feature_type` の対応を検査していません。[research_contract.js:135](../../../scripts/sam/research_contract.js:135)

   **BLOCKING・実行確認：西暦1〜99年の正しい日付を拒否する。**

   ```json
   {
     "valid": {
       "from": 1, "to": 2, "interval": "half_open",
       "from_status": "known", "to_status": "known"
     },
     "observed": {
       "date_from": "0001-06-13",
       "date_to": "0001-06-14",
       "part_of_day": null,
       "as_written": "6月13日"
     }
   }
   ```

   - 仕様 §2.4：実在する `YYYY-MM-DD` で、年も `valid` 内なので受理。
   - 実際：`E_OBSERVED`。
   - URL側も `parseResearchDate("?research_date=0001-06-13")` が例外になります。仕様上は文字列を返すべきです。
   - 99年でも失敗し、100年では成功しました。原因は `Date.UTC` が0〜99年を1900〜1999年として扱うことです。同じ実装が二か所にあります。[research_contract.js:257](../../../scripts/sam/research_contract.js:257)、[research_layer_core.js:140](../../../js/sam/research_layer_core.js:140)

   **BLOCKING・コード読解による判定：拡大すると前線点が大きな円になる。**

   入力は新 demo の表示と、カメラ幅を1000から100へ拡大する操作です。

   - 仕様 §3.3：約3pxの小円で、既存の縮尺調整に従い、大縮尺で大きな円にしない。
   - 実装：半径は常にSVG座標の `2.8`。`non-scaling-stroke` は線幅にだけ効き、半径には効きません。新しい点・ラベルは既存の縮尺調整対象にも入っていません。
   - 同じ画面幅なら、カメラ幅1000で半径2.8pxだった点は、幅100で半径28pxになります。ラベルも同様に拡大します。

   根拠：[research_layer.js:148](../../../js/sam/research_layer.js:148)、[research_layer.js:200](../../../js/sam/research_layer.js:200)、[app.js:5255](../../../js/app.js:5255)。このピクセル寸法はコードからの計算で、実ブラウザでの実測ではありません。

2. **0.1.0 の挙動は逐字同じか**

   **検証結果という範囲では、反例は見つかりませんでした。** 親コミットと対象コミットの `validateDataset` を比較し、`schema_version: "0.1.0"` の既存20 fixture と旧 demo について、エラー・警告・メッセージを含む結果が逐字一致しました。変更された分岐も、0.1.0 では旧ルールへ戻っています。

   **ADVISORY：表示まで含めた「挙動すべて同一」という主張は成り立ちません。** 旧 demo の `<title>` は実行比較で次の2行が増えました。

   ```text
   observed null
   derivation null
   ```

   横幅表示にも前線数の行が増えます。ただし、これは §3 の追加表示要求に沿っています。したがって、§2.1 の「旧ルールでの校正結果が不変」と、UIまで不変という主張は分けるべきです。

3. **CONTRACT.md と機械可読正典の食い違い**

   - **BLOCKING**：人向け説明は `flood_front` を「点または線」としていますが、機械側は Polygon も受理します。質問1の反例です。[CONTRACT.md:37](../../../docs/sam/CONTRACT.md:37)
   - **BLOCKING**：説明は実在する `YYYY-MM-DD` を認めていますが、機械側は1〜99年を拒否します。これも質問1の反例です。[CONTRACT.md:47](../../../docs/sam/CONTRACT.md:47)
   - **COSMETIC**：「エクスポートされた全列挙」とする表に、新しい `SUPPORTED_SCHEMA_VERSIONS` がありません。対応バージョン自体は本文に説明されています。[CONTRACT.md:15](../../../docs/sam/CONTRACT.md:15)

4. **壊れた実装でも通るテスト**

   完全に恒真な assertion は見つかりませんでした。ただし、次の性質を壊しても通ることを実測しました。

   - **ADVISORY：実在日チェックを外しても通る。**  
     `isIsoDate` のカレンダー照合を除去しても、前述のディスク書込み部分を除く検証テストは通過しました。既存の `2026-02-30` という反例は、同時に `date_to` より後で、`valid` の1938年からも外れています。そのため別の条件が `E_OBSERVED` を出し続けます。[validate_research.test.js:104](../../../scripts/sam/validate_research.test.js:104)  
     分離した反例 `[1938-02-30, 1938-03-02)` は、元実装では拒否、壊した実装では受理されました。

   - **ADVISORY：表示から日付フィルター呼出しを外しても通る。**  
     `computeVisible` から `isFrontVisibleOn(feature, isoDate)` の呼出しを除去しても、研究レイヤーテスト全体が通過しました。単体関数の検査はありますが、日付指定を表示まで通す検査がありません。[research_layer_core.test.js:156](../../../scripts/sam/research_layer_core.test.js:156)

   - **ADVISORY：胶水層が日付パーサーを使わなくても通る。**  
     `researchDate = Core.parseResearchDate(...)` を `researchDate = null` に置き換えても、同じテスト全体が通過しました。「胶水層が純関数を必ず呼ぶ」という要件の検証には不足しています。

5. **仕様そのものの欠陥**

   いずれも **ADVISORY** です。実装違反とは分けて扱います。

   - **`date_to` と `valid` の関係が未拘束。**  
     `valid=[1938,1939)`、`observed=[1938-06-13,1940-01-01)` は仕様上通り、実際にも通りました。しかし1939年表示では消えます。観測区間全体と有効期間の関係を定義する必要があります。

   - **unknown の片端が、既知の反対側の制約まで消す。**  
     `valid={from:null, from_status:"unknown", to:1939, to_status:"known"}` に、1940年の `observed` を入れても、現在の「unknownなら検査を省略」に従えば通ります。実際にもエラーなしでした。既知の上端だけは検査する、という規定がありません。

   - **複数日区間の意味と累積表示が曖昧。**  
     `observed=[1938-06-25,1938-06-29)`、`as_written:"25～28日"` は25日から表示されます。「25〜28日のどこかで観測した」という不確実な時刻と、「25日から継続して観測した」という期間を区別できません。前者なら25日の確定到達として見せる危険があります。

   - **横幅の「本年の前線数」が総数か絞込み後か未定義。**  
     実測では、同じ1938年の demo が日付指定なしで4件、`research_date=1938-06-19` で2件となり、観測範囲も縮みました。年全体の総数を要求するなら実装違反ですが、仕様の文面だけでは断定できません。

6. **依頼文による誘導**

   「反例」「壊れた実装でも通る」という問いに、不具合探索へ注意が偏りました。そのため、0.1.0 の検証互換性は反例なしと明記し、仕様の曖昧さを実装の BLOCKING に数えないよう区別しました。

R3 DONE

## 我方逐条处置（Sam's Agent(Opus-5.5)·2026-10-24）

主会话复现：Polygon 的 `flood_front` 校验 `errors: []`；`0099-06-13` 报 `E_OBSERVED`、`0100-06-13` 通过；`parseResearchDate('?research_date=0001-06-13')` 抛错——三条均与审核一致。缩放一条回读 `research_layer.js`（`r="2.8"` 写死、标签 `font-size:6.2px` 写死）与上游 `_rescaleSvgTypography`（上游文字按 `1/√z` 反缩放），判断与审核一致。`validate_research.test.js` 在审核者只读沙箱里因 `/tmp` 不可写而中断，主会话本机全量 exit 0，不是缺陷。

| # | 审核项 | 级别 | 处置 | 修法（派 P1-1 r2，任务单 §8） |
|---|---|---|---|---|
| 1 | `flood_front` 接受 Polygon／MultiPolygon | BLOCKING | 采纳 | 0.2.0 中 `flood_front` 只许 Point／MultiPoint／LineString／MultiLineString，否则新码 `E_GEOM_FEATURE`；CONTRACT 同步 |
| 2 | 公元 1–99 年真实日期被拒（`Date.UTC` 把 0–99 当 1900–1999） | BLOCKING | 采纳 | 两处日期判定都改用 `setUTCFullYear`；1、99、100、1938 及闰年 2 月 29 日正反例 |
| 3 | 前锋点半径与日期标签不随上游缩放机制，放大时线性变大 | BLOCKING | 采纳 | 与上游同一缩放系数（`1/√z`，含移动端系数）；浏览器验 camera 宽 1000 与 100 两档 |
| 2a | 0.1.0 文件 `<title>` 多出 `observed null`／`derivation null` 两行 | COSMETIC | 采纳 | 值为 null 或 0.1.0 文件时不写这两行；契约层「0.1.0 逐字不变」主张本身成立（审核实测 20 fixture 逐字一致） |
| 3c | CONTRACT 枚举表缺 `SUPPORTED_SCHEMA_VERSIONS` | COSMETIC | 采纳 | 补进表 |
| 4a | 拿掉真实日期检查测试仍过 | ADVISORY | 采纳 | 补孤立反例 `[1938-02-30, 1938-03-02)` |
| 4b | 拿掉 `computeVisible` 里的日期筛选测试仍过 | ADVISORY | 采纳 | 补「带 research_date 时 computeVisible 的结果」测试 |
| 4c | 胶水层不调 `parseResearchDate` 测试仍过 | ADVISORY | 采纳 | 胶水层抽出可测入口或用 DOM 桩测，任选，须能失败 |
| 5a | `observed.date_to` 与 `valid` 无约束（可跨出有效期） | ADVISORY（规格缺陷，派发方） | 采纳 | 规则改为：观测区间整体落在 `valid` 内，即 `date_from` 年 ≥ `valid.from` 且 `date_to` ≤ `valid.to` 年的 1 月 1 日 |
| 5b | 一端 unknown 时连已知端也不查 | ADVISORY（规格缺陷，派发方） | 采纳 | 只跳过 unknown／open 那一端，已知端照查 |
| 5c | 多日区间（如「25～28日」）是「其间某日」还是「持续」不可区分 | ADVISORY（规格缺陷） | **推迟到 v0.3** | 需要新增区分键，牵动数据与显示；v0.2 维持「自 date_from 起显示」，标签照写原文 `as_written` 让读者看到是区间。登记 ROADMAP 待议 |
| 5d | 横幅「本年前锋数」是总数还是筛后数未定义 | ADVISORY（规格缺陷，派发方） | 采纳 | 显示「本年 N 个；{research_date} 可见 M 个」两数并列 |
| 6 | 自陈被「反例」问法引向找缺陷 | — | 记录 | 审核者已把 0.1.0 兼容的「无反例」与规格歧义分开写，未把歧义计入实现 BLOCKING |
