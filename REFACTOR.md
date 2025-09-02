# Refactor Plan

コアを完全に書き直します。
ここで重要なことは、Studioとの互換性は無視して、コアを完璧な形にに仕上げることです。
逆にここに書かれていない機能はすべて落とします。

1. dataをやめ、itmdEventノードに移行する。(dataは、プロダクトが完成したあとにつけるので、今は敢えて実装しない)
2. remark-itineraryの出力をitmdEventを始めとした独自ノードにする。data.hPropertiesは一切使わない（使用禁止）
3. 抽出側はunist-util-visit('itmdEvent')を使用する。
4. remarkItineraryは分割・解釈・集約が近接しているので、
    - Lexing：1行テキストの安全分割（リンク/括弧/コードスパン外のみで :: / at / from / to / - を検出）
    - Parsing：TimeSpan, Head, DestBlock, RichInline を構築（インラインは mdast）
    - Normalization：TZ 継承、ISO 化、Unicode 影文字列での正規化（原文は保持）
    - Validation：仕様チェック、warnings 蓄積
    - Block Assembly（ブロック集約）：
    - Node Building：itmdEvent ノードに確定（※今回は data/hProperties は使わない／禁止）
    - Extract（別ファイル/層）：visit('itmdEvent') で ItineraryEvent[] を生成
    ↑これは、可能であればファイルを小分けにして、DIパターンで渡していくのが良さそうです。
5. インラインはmdastを保持する（再結合はやめる、レンダリングは h(all)（remark-rehype の handler で）に渡す）
6. 位置情報の厳密保持: 行テキスト→トークンの段階で start/end offset（UTF-16/UTF-8 のどちらを採用するかも固定）各フィールド（title/from/to）にも position を付与: mdast ノードの position を活かし、VFile の value に対する sliceを再現可にする

## メモ

- Frontmatter の扱い
  - coreはfrontmatterを一切使いません。frontmatterを抜き取ったあとの本文だけを受け取る想定です。
  - frontmatterはstudioでの描画のみに使われるので、今は関係ありません。

## ItmdEventの型定義(最終確定)

```ts
// ==============================================
// ITMDEvent: 最終型定義（ASTノード & 抽出DTO）
// ==============================================

import type { Parent, PhrasingContent, Position } from 'mdast';

/** インラインは Markdown の mdast ノード列を保持（部分リンク対応） */
export type RichInline = PhrasingContent[];

/** 午前/午後だけ確定しているときのマーカー */
export type TimeMarker = 'am' | 'pm';

/** itmd の mdast 拡張ノード（remark-itinerary の出力） */

export interface ITMDEventNode extends Parent {
  type: 'itmdEvent';

  /** 時刻情報（ISOは正規化後に付与。marker と hh:mm は排他） */
  time?: {
    start?: { hh: number | null; mm: number | null; tz?: string | null } | null;
    end?:   { hh: number | null; mm: number | null; tz?: string | null } | null;
    startISO?: string | null;
    endISO?: string | null;
    marker?: TimeMarker | null; // [am] / [pm] のときのみ設定
  };

  /** 種別例: flight / taxi / train / breakfast / sightseeing ... */
  eventType: string;

  /** タイトル（便名など）。部分リンク保持 省略可能*/
  title?: RichInline | null;

  /** 宛先：kind により構造を分岐。single は at/from/to のうち at を優先（from/to とは排他） */
  destination?: (
    | {
        kind: 'single';
        from?: RichInline | null;
        to?:  RichInline | null;
        at?:  RichInline | null; // at がある場合は from/to は未使用
      }
    | {
        kind: 'dashPair';
        from?: RichInline | null; // 出発地（departure）
        to?:  RichInline | null; // 到着地（arrival）
        at?:  null;
      }
  ) | null;

  /** 直後のメタリスト等から抽出。値は素直に保持（必要に応じて正規化側で解釈） */
  meta?: Record<string, string | number | boolean | null | RichInline> | null;

  /** 構文/正規化時の警告メッセージ */
  warnings?: string[];

  /** 取り込んだ元ノード（段落/リスト等）を保持してラウンドトリップ可能にする */
  children: Parent['children'];

  /** 原文位置（mdast標準） */
  position?: Position;

  /** スキーマバージョン（将来互換用） */
  version: '1';
}
```

## 推奨アーキテクチャ

推奨アーキテクチャ
ディレクトリ構成（例）
packages/core/src/itmd/
  types.ts            // 共通型（ItmdEventNode, RichInline, TimePoint, Policy 等）
  services.ts         // ポート定義（TzService, IsoService, UnicodeService, Logger 等）
  pipeline/
    lex.ts            // Lexing
    parse.ts          // Parsing
    normalize.ts      // Normalization
    validate.ts       // Validation
    assemble.ts       // Block Assembly（兄弟巻き取り）
    build.ts          // Node Building（itmdEvent 生成）
    run.ts            // パイプライン合成（オーケストレータ）
  remark/itinerary.ts // remark プラグイン：mdast を受け取り pipeline.run を呼ぶだけ
  extract/index.ts    // visit('itmdEvent') → ItineraryEvent[] に変換
  utils/{position.ts, shadow-unicode.ts, mdast-inline.ts ...}

依存の持たせ方（軽量 DI）

Parameter DI（関数引数で注入）を基本にします。

各工程は 純関数：副作用なし・返り値で結果を返す。

テストでは services を モックに差し替え可能。

// services.ts（ポート定義）
export interface TzService { normalize(tz?: string|null): string|null; }
export interface IsoService { toISO(date: string, hh: number|null, mm: number|null, tz: string|null): string|null; }
export interface UnicodeService {
  makeShadow(s: string): { shadow: string; map: (shadowIdx: number) => number };
}
export interface Logger { warn(msg: string): void; }

export interface Policy {
  amHour: number; pmHour: number;            // 推定時刻が必要な時に使う（抽出側/Studio側）
  allowUrlSchemes: string[];                // レンダリング層の安全策
  tzFallback: string|null;                  // baseTz
}

export interface Services {
  tz: TzService; iso: IsoService; unicode: UnicodeService; log?: Logger; policy: Policy;
}

各工程のファイルごとの責務とシグネチャ
// lex.ts
export function lexLine(
  line: string,
  ctx: { baseTz?: string },
  sv: Services
): LexTokens

角/丸括弧・コードスパン外のみで :: / at / from / to / - を検出（影文字列で安全に）

位置マップを保持

// parse.ts
export function parseHeader(
  tokens: LexTokens,
  mdInline: PhrasingContent[], // その行の mdast inline
  sv: Services
): ParsedHeader // TimeSpan, Head, DestBlock, RichInline（mdast保持）

// normalize.ts
export function normalizeHeader(
  h: ParsedHeader,
  ctx: { baseTz?: string; dateISO?: string },
  sv: Services
): NormalizedHeader // tz継承, marker処理, ISO算出(null可), Unicodeは影側のみ

// validate.ts
export function validateHeader(
  h: NormalizedHeader,
  sv: Services
): { header: NormalizedHeader; warnings: string[] }

// assemble.ts  （ここで“複数行ブロック”を束ねる）
export function assembleEvents(
  root: Root,
  sv: Services
): Root
// 親.children を走査：イベント段落を見つけたら直後のトップレベル list/説明段落を吸収

// build.ts
export function buildEventNode(
  header: NormalizedHeader,
  absorbed: Node[],            // 吸収した list/para
  pos: Position | undefined,
  sv: Services
): ItmdEventNode

// run.ts（パイプライン・オーケストレーション）
export function runPipeline(root: Root, file: VFile, sv: Services): Root {
  // assembleEvents 内で各段の関数を呼ぶ構成にしても良いし、
  // 先に “イベント候補の paragraph” を列挙して逐次 lex→parse→normalize→validate→build でもOK
  return assembleEvents(root, sv);
}

// remark/itinerary.ts（薄いアダプタ）
export const remarkItinerary: Plugin<[Partial<Policy>?], Root> =
  (policy = {}) => (tree, file) => {
    const services = makeDefaultServices(policy, file); // luxon/Temporal等を束ねる
    runPipeline(tree, file, services);
  };

// extract/index.ts（データ抽出）
export function toItineraryEvents(root: Root): ITMDEvent[] {
  const out: ITMDEvent[] = [];
  visit(root, 'itmdEvent', (n: ItmdEventNode) => out.push(toDTO(n)));
  return out;
}

これって DI パターン？

はい（依存性逆転）：各工程は ポート（Services） にのみ依存し、具体実装（luxon/Temporal/独自正規化）は アダプタで注入。

ただし DI コンテナは不要。TS では **関数引数で注入（Parameter DI）**の方が読みやすく、unified の世界と馴染みます。

追加の実務ヒント

例外を投げない：warnings に積む（remark は失敗に厳しいため）

オプションは Policy に集約：am/pm の意味付け、許可スキーマ、tzFallback 等

テスト容易性：services をモックして時刻/TZ/Unicode を決め打ち→工程単体テストが楽

まとめ

工程ごとにファイル分割し、**軽量DI（Services/Policy を引数注入）**で繋ぐのが最適。

remark-itinerary は薄いアダプタに徹し、AST 変更の本体は pipeline に集約。

これでテスト可能性・拡張性・可読性をすべて確保できます。
