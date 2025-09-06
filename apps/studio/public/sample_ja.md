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

- ✈️ **フライト・宿泊・観光・交通** を時系列で整理
- 🌍 **タイムゾーン** を意識した時刻管理
- 💰 **費用の記録** と複数通貨対応

# 使用例

## 2026-01-23

> [08:50@Asia/Tokyo] - [16:35@Europe/Paris] flight AF187 from HND to CDG
>
> - price: 285000 JPY
> - class: Economy
> - seat: 32A
> - note: オンラインチェックイン済み

> [18:30@Europe/Paris] train RER B :: CDG - Châtelet
>
> - price: EUR 11.45
> - duration: 25 minutes

> [19:00@Europe/Paris] subway Metro Line 1 :: Châtelet - Louvre
>
> - price: EUR 2.10

> [!CAUTION]
>
> 電源プラグの準備
> フランスではタイプC/Eのプラグが必要です。
> 日本のタイプAプラグは使用できません。

> [19:30@Europe/Paris] hotel :: [Example Hotel Paris](https://example.com/hotel)
>
> - check-in: 15:00
> - check-out: 11:00
> - price: EUR 180/night
> - wifi: あり
> - note: 朝食付き

> [20:30@Europe/Paris] dinner :: [Bistro Example](https://example.com/bistro)
>
> - price: EUR 45

## 2026-01-24 @Europe/Paris

> [!TIP] 美術館の混雑回避
>
> 美術館のチケットは事前にオンライン購入することで、
> 長い行列を避けられます。公式アプリもダウンロードしておきましょう。

> [09:00] breakfast :: [ホテルレストラン](https://example.com/hotel)

> [10:30] - [13:00] museum :: [ルーヴル美術館](https://example.com/louvre)
>
> - price: EUR 17
> - note: 公式アプリで `skip-the-line` チケット購入済み

> [13:30] lunch :: [Café Example](https://example.com/cafe)
>
> - price: EUR 25

> [!WARNING] 交通機関のストライキ
>
> フランスでは交通機関のストライキが頻繁に発生します。
> 移動前に運行情報を確認しましょう。

> [15:00] - [17:00] sightseeing :: エッフェル塔
>
> - price: EUR 26.80
> - note: 第2展望台まで

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
> [時刻] イベントタイプ タイトル :: 場所/詳細
> - 属性: 値
```

## 2. イベントタイプ

イベントタイプは3つのカテゴリに自動分類されます：

### 交通 (Transportation)

```markdown
> [10:00] flight AF187 :: HND - CDG          # フライト
> [14:00] train :: 東京駅 - 京都駅            # 電車
> [15:30] bus :: 空港 - ホテル                # バス  
> [16:00] taxi :: レストラン - ホテル          # タクシー
> [09:00] subway :: Châtelet - Louvre         # 地下鉄
> [10:00] ferry :: 本島 - 離島                # フェリー
> [11:00] drive :: レンタカーで移動           # ドライブ
> [12:00] cablecar :: 山頂駅へ                # ケーブルカー
```

### 宿泊 (Stay)

```markdown
> [15:00] hotel :: [Example Hotel](https://example.com)    # ホテル
> [18:00] ryokan :: 温泉旅館                               # 旅館
> [14:00] hostel :: ユースホステル                         # ホステル
> [16:00] dormitory :: ゲストハウス                        # ドミトリー
> [15:00] stay :: 友人宅                                  # 汎用的な宿泊
```

### アクティビティ (Activity)

上記以外のすべてのイベントタイプ：

```markdown
> [10:00] museum :: ルーヴル美術館           # 美術館
> [12:00] lunch :: イタリアンレストラン       # 昼食
> [14:00] sightseeing :: エッフェル塔         # 観光
> [09:00] breakfast                       # 朝食（タイトル省略可）
> [15:00] shopping :: デパート                # 買い物
> [16:00] cafe :: カフェで休憩                # カフェ
> [20:00] dinner :: レストラン予約            # 夕食
```

## 3. 時刻の記法

### 具体的な時刻

```markdown
> [09:00] breakfast          # 基本形
> [09:00@Asia/Tokyo] lunch   # タイムゾーン付き
> [09:00] - [11:30] meeting  # 時間範囲
> [09:00+1] arrival          # 翌日を示す +1
```

### 大まかな時間帯

```markdown
> [am] activity   # 午前
> [pm] cafe       # 午後
> [] sightseeing  # 時刻未定
```

## 4. 場所の記法

### 単一の場所

```markdown
> [10:00] museum :: ルーヴル美術館
> [15:00] cafe :: [Café Example](https://example.com)
```

### 移動（A地点からB地点）

```markdown
> [08:00] flight :: NRT - CDG                    # ダッシュ形式
> [10:00] train from Tokyo to Kyoto              # from-to 形式
```

### アクティビティ

```markdown
> [14:00] museum :: [Example Museum](https://example.com)
> - note: 公式アプリを利用し `skip-the-line` を使用
```

### 宿泊

宿泊先の名称を書き、必要に応じて `::` の後にエリアやメモを追記します。

```markdown
> [15:00] hotel :: Example Paris
```

## 5. 属性キー

`- key: value` で始まる行で、イベントに詳細情報を追加できます。

### 代表的な属性キー

#### 料金関連

```markdown
> - price: EUR 100          # 価格（price/costは自動集計される）
> - cost: 15000 JPY         # 費用（priceと同様に扱われる）
```

#### 交通関連

```markdown
> - class: Economy          # 座席クラス
> - seat: 32A               # 座席番号
> - duration: 2h 30m        # 所要時間
> - platform: 5             # プラットフォーム
> - gate: 42                # ゲート番号
```

#### 宿泊関連

```markdown
> - check-in: 15:00         # チェックイン時刻
> - check-out: 11:00        # チェックアウト時刻
> - room: デラックスツイン   # 部屋タイプ
> - wifi: あり              # WiFi有無
> - breakfast: 込み         # 朝食付き
```

#### 予約・備考

```markdown
> - reservation: 要予約     # 予約情報
> - url: https://example.com # 関連URL
> - note: 雨天中止          # 備考・注意事項
> - menu: コース料理        # メニュー
> - tel: 03-1234-5678       # 電話番号
```

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

2. **日付見出し指定** - その日のデフォルト

   ```markdown
   ## 2026-01-24 @Europe/Paris

   > [09:00] breakfast     # Europe/Paris として解釈
   ```

3. **フロントマター** - ドキュメント全体のデフォルト

   ```yaml
   ---
   timezone: Asia/Tokyo
   ---
   ```

4. **プラグインオプション** - 処理時の設定

   ```typescript
   .use(remarkItinerary, { tzFallback: 'Asia/Tokyo' })
   ```

### 通貨の処理

通貨も同様にフォールバック処理されます：

```yaml
---
currency: JPY              # ドキュメントのデフォルト通貨
---
```

```markdown
> [10:00] lunch ::
> - price: 1500            # JPY として解釈される
> - price: EUR 25          # 明示的に EUR を指定
> - price: $30             # USD として解釈される
```

### 時刻の曖昧な表現

`[am]` と `[pm]` はポリシー設定で時刻が決まります：

```typescript
.use(remarkItinerary, {
  amHour: 9,    // [am] = 09:00
  pmHour: 15    // [pm] = 15:00
})
```

---

# 開発者向け情報

## インストールと基本設定

```bash
npm install remark-itinerary
```

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItinerary from 'remark-itinerary';
import remarkItineraryAlert from 'remark-itinerary-alert';

const processor = unified()
  .use(remarkParse)
  .use(remarkItineraryAlert)      // アラート機能を追加（remarkItineraryより先に実行する必要があります）
  .use(remarkItinerary, {
    tzFallback: 'Asia/Tokyo',      // デフォルトタイムゾーン
    currencyFallback: 'JPY',       // デフォルト通貨
    amHour: 9,                     // [am] の時刻
    pmHour: 15                     // [pm] の時刻
  });
```

## AST ノード構造

remark-itinerary は Markdown AST に以下のカスタムノードを追加します：

```typescript
interface ITMDEventNode {
  type: 'itmdEvent';
  eventType: string;                    // 'flight', 'hotel' など
  baseType: 'transportation' | 'stay' | 'activity';
  time?: {
    kind: 'none' | 'marker' | 'point' | 'range';
    // ... 時刻情報
  };
  title?: RichInline | null;           // イベントタイトル
  destination?: {                      // 場所情報
    kind: 'single' | 'dashPair' | 'fromTo';
    // ... 場所詳細
  };
  body?: ITMDBodySegment[];            // 属性情報など
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

```tsx
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

## リソース

- GitHub: [cumuloworks/itinerary-md](https://github.com/cumuloworks/itinerary-md)  
- デモ: [https://tripmd.dev/](https://tripmd.dev/)
- npm: [remark-itinerary](https://www.npmjs.com/package/remark-itinerary)
