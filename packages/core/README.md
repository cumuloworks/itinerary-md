# @itmd 構文解析パイプライン概要

`itmd` は Markdown の段落から旅程イベントを抽出して `mdast` に専用ノード（`itmdEvent`）を組み立てるパイプラインを提供します。入力は Markdown の `Root`（mdast）で、出力も `Root` ですが、イベント段落が `itmdEvent` ノードに置き換わります。

- 入口関数: `assembleEvents(root, services)`（`pipeline/assemble.ts`）
- イベントノード型: `ITMDEventNode`（`types.ts`）

## 全体フロー

1. 見出し(H2)から日付・タイムゾーンの文脈を更新
2. 段落の1行目が `[` で始まる場合にイベント候補として処理
3. 先頭行を字句解析（`lexLine`）し、区切りや構文を検出
4. 構文解析（`parseHeader`）で、時刻・イベント種別・タイトル・目的地を抽出（位置情報も付与）
5. 正規化（`normalizeHeader`）で ISO 8601 に展開（必要に応じて）
6. 検証（`validateHeader`）で軽微な警告を生成
7. 直後のリストをメタデータとして吸収（条件あり）
8. `itmdEvent` ノードを構築し、段落を置き換え

---

## 各ステップ詳細

### 1) 字句解析: `pipeline/lex.ts`

- 入力: 先頭行テキスト
- 出力: `LexTokens`（影文字列・オフセットマップ・区切り一覧）
- 検出する区切り:
  - `::`（doublecolon）
  - `at`（語境界）
  - ` - `（スペース-ハイフン-スペース; routeDash）
  - `from`, `to`（語境界）
- 解析時はコードスパン `` `code` `` と `[]`, `()` の内側は除外（外側のみ区切りを有効化）。

### 2) 構文解析: `pipeline/parse.ts`（`parseHeader`）

- 時刻の解釈（先頭）
  - 形式: `[(start)][ - [(end)]]` を先頭から貪欲に消費
  - `start`/`end`: `HH:MM[@TZ][+N]` を許可
  - 特殊: `[am]` / `[pm]`（マーカー）や `[]`（明示的に無し）
- ヘッダ本体の分割
  - `::` または `at` があれば「ヘッダ / 宛先」に分割
  - 区切りがない場合はヘッダのみ
- ヘッダの解釈
  - 先頭トークンを `eventType`、残りを `title` として抽出
  - `mdast` のインラインから部分ノードをスライスして `title` を再構築（テキストのみの場合は fallback）
- 宛先の解釈（`destination`）
  - `A - B`（最後の ` - ` で分割）→ kind: `dashPair`
  - `from A to B`（ヘッダ内 or 宛先側文字列）→ kind: `fromTo`
  - `:: Place` / `at Place` → kind: `single`
- 位置情報（`positions`）
  - `time.start`/`time.end`/`time.marker`、`title`、`destination.(from|to|at)` のテキストスライス範囲を、先頭行のインライン基準オフセットで保持

### 3) 正規化: `pipeline/normalize.ts`（`normalizeHeader`）

- `EventTime` を必要に応じて ISO 8601 文字列に展開
  - `point`: `startISO`
  - `range`: `startISO`, `endISO`（`+N` は終了日のみ加算）
- タイムゾーン優先度: 明示 > 見出しで検出したタイムゾーン > ポリシー既定
- ISO 8601 の生成は `services.iso.toISO` を使用（ISO 8601 準拠）

### 4) 検証: `pipeline/validate.ts`（`validateHeader`）

- 現状は `eventType` 欠落のみ警告（拡張余地あり）

### 5) 組み立て: `pipeline/assemble.ts`（`assembleEvents`）

- H2 見出し（`##`）を日付文脈として解釈（`parseDateText`）
  - `currentDateISO` / `currentDateTz` を更新し、後続イベントの正規化に使用
- イベント候補の段落は「先頭行のみ」をヘッダとして使用
- 直後が `list` のときに限り、連続するリストをすべて吸収
  - メタデータ抽出: リスト各項目の「先頭段落」から `key: value` を1段のみ抽出
  - 値は `RichInline` として保持（リッチテキスト可）
  - 仕様: イベント直後のリストのみ・トップレベル箇条書き・チェックボックスは特別扱いしない
- `buildEventNode` で `itmdEvent` を生成し、元段落を置換

---

## サポートする文法（例）

### 時刻

- `[08:10]` / `[8:05]`（ゼロ詰め不要）
- `[08:10@Asia/Tokyo]`（タイムゾーン明示）
- `[22:30]-[06:10]`（時間範囲）
- `[22:30]-[06:10@Europe/Paris+1]`（終了側のTZと翌日オフセット）
- `[am]` / `[pm]`（マーカー）
- `[]`（明示的に無し）

### ヘッダ/宛先

- `[08:10] Flight JL000 :: Haneda`
- `[08:10] Flight JL000 at Haneda`
- `[08:10] Tokyo - Osaka`（ルート。`title=null`）
- `[08:10] Train from Tokyo to Osaka`

---

## イベントノード（`ITMDEventNode`）

主なフィールド:

- `eventType`: 先頭トークン
- `title: RichInline | null`
- `destination`: `single` | `dashPair` | `fromTo` | null
- `time`: `none | marker | point | range`（必要に応じ `startISO/endISO` を付与）
- `meta`: `Record<string, RichInline | primitive>`（直後リストから抽出）
- `positions`: `title/destination/time` のテキストスライス位置
- `warnings`: 検証での注意

詳細は `packages/core/src/itmd/types.ts` を参照してください。

---

## ファイル対応表

- `pipeline/assemble.ts`: パイプラインの統括（エントリポイント）
- `pipeline/lex.ts`: 字句解析（区切り検出・影文字列）
- `pipeline/parse.ts`: 構文解析（時刻/種別/タイトル/宛先/位置）
- `pipeline/normalize.ts`: 正規化（ISO 8601 展開・TZ/日付文脈）
- `pipeline/validate.ts`: 検証（警告生成）
- `types.ts`: ノード型・時間型の定義

---

## 使い方（最小例）

```ts
import { assembleEvents } from './pipeline/assemble';
import type { Root } from 'mdast';
import { createServices } from '../services'; // 例: 実際のサービス生成に合わせて

const services = createServices(/* policy, tz, iso など */);

function transform(root: Root): Root {
  return assembleEvents(root, services);
}
```

Remark に組み込む場合は、`mdast` の `Root` 受け渡しの段階で `assembleEvents` を呼び出してください（既存のプラグイン構成に追従）。

---

## 補足

- ISO 8601 文字列の生成は必ず `services.iso.toISO` を介して行い、ISO 8601 に準拠します。
- メタデータはイベント直後のリストのみを対象とし、トップレベルの箇条書きを1段だけ読み取ります。チェックボックスは特別扱いしません。
