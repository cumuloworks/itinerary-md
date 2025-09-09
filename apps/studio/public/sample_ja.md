---
type: tripmd
title: TripMD へようこそ
description: TripMD (itinerary-md) は旅行の行程を Markdown で記述・共有するためのフレームワークです。
tags:
 - イントロダクション
 - サンプル
 - 日本
 - パリ
budget: 750000 JPY
currency: JPY
timezone: Asia/Tokyo
---

## TripMD (itinerary-md) とは？

TripMD は、Markdown のシンプルさと柔軟性を活かして、旅行の行程を構造化されたテキストで記述・共有できるフレームワークです。

Studio(エディタ)と、その基盤となるRemarkプラグインから構成されており、

- ✈️ **フライト・宿泊・観光・交通** など旅行特有のイベントを整理
- 🌍 **タイムゾーン** を加味した時間管理
- 💰 **費用の試算と記録** と複数通貨の対応

# 使用例

## 2026-01-23

> [08:50@Asia/Tokyo] - [16:35@Europe/Paris] flight AF187 from 羽田空港^HND to シャルル・ド・ゴール空港^CDG
>
> - price: 285000 JPY
> - class: Economy
> - seat: 32A
> - note: 2時間前にチェックイン

> [18:30@Europe/Paris] train RER B :: CDG - Châtelet
>
> - price: EUR 11.45
> - duration: 25 minutes

> [19:00@Europe/Paris] subway Metro Line 1 :: Châtelet - Louvre
>
> - price: EUR 2.10

> [!CAUTION] 電源プラグの準備
>
> フランスではタイプC/Eのプラグが必要。

> [19:30@Europe/Paris] hotel :: [Example Hotel Paris](https://example.com/hotel)
>
> - check-in: 15:00
> - check-out: 11:00
> - price: EUR {80*2}
> - wifi: あり

> [20:30@Europe/Paris] dinner フランス料理 :: Restaurant Example
>
> - price: EUR 45

## 2026-01-24 @Europe/Paris

> [!TIP] 美術館チケット
>
> 美術館のチケットは事前にオンライン購入する

> [09:00] breakfast :: ホテル

> [10:30] - [13:00] museum :: [ルーヴル美術館](https://example.com/louvre)
>
> - price: EUR 17
> - note: 公式アプリで `skip-the-line` チケット購入済み

> [13:30] lunch :: [Café Example](https://example.com/cafe)
>
> - price: EUR 25

> [15:00] - [17:00] sightseeing :: エッフェル塔
>
> - price: EUR 26.80

> [18:30] dinner :: [Le Example Restaurant](https://example.com/restaurant)
>
> - price: EUR 65
> - note: **コース料理**を予約

> [pm] walk :: セーヌ川沿いを散策

---

# 文法リファレンス

補足: タイトル（`title`）、場所（`destination`）、本文セグメント（`body`）は Markdown のインライン要素（リンク、強調、コード など）に対応しています。

TripMD の文法を体系的に説明します。

## 1. イベント行の基本構造

すべてのイベントは `>` で始まる引用ブロックで記述します。

```markdown
> [時刻] イベントタイプ タイトル^別名 :: 場所・ルート^別名
> - 属性: 値
```

## 2. イベントタイプ

イベントタイプは主に3種類あり、タイトルをつけることができます。

`タイトル^別名`の記法をすることで、現地語表記などを書くことができます。

### 交通 (Transportation)

```markdown
> [10:00] flight AF187 :: HND - CDG # フライト
> [14:00] train :: 東京駅 - 京都駅 # 電車
> [15:30] bus :: 空港 - ホテル # バス 
> [16:00] taxi :: レストラン - ホテル # タクシー
> [09:00] subway :: Châtelet - Louvre # 地下鉄
> [10:00] ferry :: 本島 - 離島 # フェリー
> [11:00] drive :: レンタカーで移動 # ドライブ
> [12:00] cablecar :: 山頂駅へ # ケーブルカー
```

### 宿泊 (Stay)

```markdown
> [15:00] hotel :: [Example Hotel](https://example.com) # ホテル
> [18:00] ryokan :: 温泉旅館 # 旅館
> [14:00] hostel :: ユースホステル # ホステル
> [16:00] dormitory :: ゲストハウス # ドミトリー
> [15:00] stay :: 友人宅 # 汎用的な宿泊
```

### アクティビティ (Activity)

上記以外のすべてのイベントタイプ：

```markdown
> [10:00] museum :: ルーヴル美術館 # 美術館
> [12:00] lunch :: イタリアンレストラン # 昼食
> [14:00] sightseeing :: エッフェル塔 # 観光
> [09:00] breakfast # 朝食（タイトル省略可）
> [15:00] shopping :: デパート # 買い物
> [16:00] cafe :: カフェで休憩 # カフェ
> [20:00] dinner :: レストラン予約 # 夕食
```

## 3. 時刻の記法

### 具体的な時刻

```markdown
> [09:00] breakfast # 基本形
> [09:00@Asia/Tokyo] lunch # タイムゾーン付き
> [09:00] - [11:30] meeting # 時間範囲
> [09:00+1] arrival # 翌日を示す +1
```

### 大まかな時間帯

```markdown
> [am] activity # 午前
> [pm] cafe # 午後
> [] sightseeing # 時刻未定
```

## 4. 場所の記法

### 場所

```markdown
> [10:00] museum :: ルーヴル美術館 # ダブルコロン形式
> [15:00] cafe at [Café Example](https://example.com) # at 形式
```

### 移動

```markdown
> [08:00] flight :: NRT - CDG # ダッシュ形式
> [10:00] train from Tokyo to Kyoto # from-to 形式
```

それぞれの記号(`::`, `-`, `from`, `to`, `at`)の前後にはスペースが必要です。

## 5. 属性(メタデータ)

`- key: value` で始まる行で、イベントに詳細情報を追加できます。

### 代表的な属性キー

#### 料金関連

```markdown
> - price: EUR 100
> - cost: 15000 JPY
```

`price`, `cost`は通貨の変換・自動集計が行われます。

`{25*4} EUR`のような表記で四則演算が可能です。

#### 交通関連

```markdown
> - class: Economy # 座席クラス
> - seat: 32A # 座席番号
> - duration: 2h 30m # 所要時間
> - platform: 5 # プラットフォーム
> - gate: 42 # ゲート番号
```

#### 宿泊関連

```markdown
> - check-in: 15:00 # チェックイン時刻
> - check-out: 11:00 # チェックアウト時刻
> - room: デラックスツイン # 部屋タイプ
> - wifi: あり # WiFi有無
> - breakfast: 込み # 朝食付き
```

#### 予約・備考

```markdown
> - reservation: 要予約 # 予約情報
> - url: https://example.com # 関連URL
> - note: 雨天中止 # 備考・注意事項
> - menu: コース料理 # メニュー
> - tel: 03-1234-5678 # 電話番号
```

他にも、自由に文章を記述することが可能です。

## 6. アラート

アラートは `[!TYPE]` で始まる引用ブロックとして書きます。

> [!NOTE] Note
>
> TripMD は 5 種類のアラートタイプに対応しています。

> [!CAUTION]
> フランスでは電源プラグ（タイプ E）が必要です。

> [!WARNING]
> 交通機関のストライキが予定に影響する可能性があります。

> [!TIP]
> 美術館のチケットはオンライン購入で待ち時間を短縮。

> [!IMPORTANT]
> パスポート、カード、保険情報は安全に保管してください。

## 7. 通貨とタイムゾーンのフォールバック

### タイムゾーンの処理

タイムゾーンは以下の優先順位で決定されます。

1. **イベント個別指定** - 最優先

 ```markdown
 > [09:00@Asia/Tokyo] departure :: 成田空港
 ```

1. **日付見出し指定** - その日のデフォルト

 ```markdown
 ## 2026-01-24 @Europe/Paris

 > [09:00] breakfast # Europe/Paris として解釈
 ```

1. **フロントマター** - ドキュメント全体のデフォルト

 ```yaml
 ---
 timezone: Asia/Tokyo
 ---
 ```

1. **プラグインオプション** - 処理時の設定

 ```typescript
 .use(remarkItinerary, { defaultTimezone: 'Asia/Tokyo' })
 ```

### 通貨の処理

通貨も同様にフォールバック処理されます：

```yaml
---
currency: JPY # ドキュメントのデフォルト通貨
---
```

```markdown
> [10:00] lunch ::
> - price: 1500 # JPY として解釈される
> - price: EUR 25 # 明示的に EUR を指定
> - price: $30 # USD として解釈される
```

### 時刻の曖昧な表現

`[am]` と `[pm]` はポリシー設定で時刻が決まります：

```typescript
.use(remarkItinerary, {
 amHour: 9, // [am] = 09:00
 pmHour: 15 // [pm] = 15:00
})
```

---

# 開発者向け情報

TripMD(コードネーム`itinerary-md`/`itmd`)は [@cumuloworks](https://github.com/cumuloworks) によって考案・開発された旅程を記述するためのマークダウン拡張です。

このTripMD Studioアプリは、そのデモンストレーションのために`apps/studio`で公開されています。

パッケージには、基盤となるRemarkパーサー(`remark-itinerary`)、アラート記法用のRemarkパーサー(`remark-itinerary-alert`)、エディター本体(`@itinerary-md/editor`)が含まれます。

## インストールと基本設定

```bash
npm install remark-itinerary remark-itinerary-alert
```

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItinerary from 'remark-itinerary';
import remarkItineraryAlert from 'remark-itinerary-alert';

const processor = unified()
 .use(remarkParse)
 .use(remarkItineraryAlert) // アラート機能を追加（remarkItineraryにより日付属性を付与するため、remarkItineraryより先に実行する必要があります）
 .use(remarkItinerary, {
 defaultTimezone: 'Asia/Tokyo', // デフォルトタイムゾーン
 defaultCurrency: 'JPY', // デフォルト通貨
 amHour: 9, // [am] の時刻
 pmHour: 15 // [pm] の時刻
 });
```

## AST ノード構造

remark-itinerary は Markdown AST に以下のカスタムノードを追加します：

```typescript
interface ITMDEventNode {
 type: 'itmdEvent';
 eventType: string; // 'flight', 'hotel' など
 baseType: 'transportation' | 'stay' | 'activity';
 time?: {
 kind: 'none' | 'marker' | 'point' | 'range';
 // ... 時刻情報
 };
 title?: RichInline | null; // イベントタイトル
 destination?: { // 場所情報
 kind: 'single' | 'dashPair' | 'fromTo';
 // ... 場所詳細
 };
 body?: ITMDBodySegment[]; // 属性情報など
}
```

## カスタム処理の実装

```typescript
import { visit } from 'unist-util-visit';

const customPlugin = () => {
 return (tree) => {
 visit(tree, 'itmdEvent', (node) => {
 // イベントノードを処理
 if (node.eventType === 'flight') {
 // フライト情報を抽出
 console.log('Flight found:', node.title);
 }
 
 // price 属性を集計
 if (node.body) {
 const prices = node.data?.itmdPrice || [];
 prices.forEach(p => {
 console.log('Price:', p.price);
 });
 }
 });
 };
};
```

## React での使用例

```typescript
import { useMemo } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItinerary from 'remark-itinerary';
import remarkItineraryAlert from 'remark-itinerary-alert';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';

function ItineraryViewer({ markdown }) {
 const content = useMemo(() => {
 const processor = unified()
 .use(remarkParse)
// remarkItineraryAlert should come first
 .use(remarkItineraryAlert)
 .use(remarkItinerary)
 .use(remarkRehype)
 .use(rehypeReact, { createElement: React.createElement });
 
 return processor.processSync(markdown).result;
 }, [markdown]);
 
 return <div>{content}</div>;
}
```

## パッケージ構成とライセンス

- **remark-itinerary** - コアパーサー (MITライセンス)
- **remark-itinerary-alert** - アラート拡張 (MITライセンス)
- **@itinerary-md/editor** - React エディタコンポーネント (UNLICENSED)
- **@itinerary-md/studio**- Studioアプリ (UNLICENSED)

## リソース

- GitHub: [cumuloworks/itinerary-md](https://github.com/cumuloworks/itinerary-md)
- デモ: [https://tripmd.dev/](https://tripmd.dev/)
- npm: [remark-itinerary](https://www.npmjs.com/package/remark-itinerary)
- npm: [remark-itinerary-alert](https://www.npmjs.com/package/remark-itinerary-alert)
