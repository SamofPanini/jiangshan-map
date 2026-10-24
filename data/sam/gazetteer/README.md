# 地名坐标表（gazetteer）

- `huanghe1938_gazetteer.json`：1938 年黄河泛滥相关地图上的地名及其现代坐标，用作配准控制点和地名锚定。
- 制作：2026-10-24，由 Codex `gpt-6.1-sol` high 联网查询（只读，每条必须给出处、查不到写 NOT-FOUND）；主会话抽核 5 条与 Wikidata 原页一致，并改正 1 条（太和，见该条 `note`）。`checked_by_main_session` 标出核过的条目。
- 出处以 Wikidata（CC0）为主；`source_kind` 为 `wikipedia` 或 `other` 的条目，坐标取自所列页面；`license_note` 非空的条目公开发布前要处理。
- 坐标是现代町镇或旧城区的代表点，不是 1938 年的旧县署、渡口或决口点的实测位置。`NOT-FOUND` 表示这次公开检索没有查到，不表示地点不存在。
