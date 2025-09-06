---
type: tripmd
title: Welcome to TripMD
description: TripMD (itinerary-md) is a framework for writing and sharing travel itineraries in Markdown.
tags:
  - Introduction
  - Sample
  - Japan
  - Paris
budget: 750000 JPY
currency: JPY
timezone: Asia/Tokyo
---

## What is TripMD (itinerary-md)?

TripMD is a framework that leverages the simplicity and flexibility of Markdown to write and share travel itineraries in structured text.

- ✈️ **Organize flights, accommodations, sightseeing, and transportation** chronologically
- 🌍 **Timezone-aware** time management
- 💰 **Expense tracking** with multi-currency support

# Usage Example

## 2026-01-23

> [08:50@Asia/Tokyo] - [16:35@Europe/Paris] flight AF187 from HND to CDG
>
> - price: 285000 JPY
> - class: Economy
> - seat: 32A
> - note: Online check-in completed

> [18:30@Europe/Paris] train RER B :: CDG - Châtelet
>
> - price: EUR 11.45
> - duration: 25 minutes

> [19:00@Europe/Paris] subway Metro Line 1 :: Châtelet - Louvre
>
> - price: EUR 2.10

> [!CAUTION]
>
> Power adapter preparation
> France uses Type C/E plugs.
> Japanese Type A plugs cannot be used.

> [19:30@Europe/Paris] hotel :: [Example Hotel Paris](https://example.com/hotel)
>
> - check-in: 15:00
> - check-out: 11:00
> - price: EUR 180/night
> - wifi: Available
> - note: Breakfast included

> [20:30@Europe/Paris] dinner :: [Bistro Example](https://example.com/bistro)
>
> - price: EUR 45

## 2026-01-24 @Europe/Paris

> [!TIP] Avoiding museum crowds
>
> Purchase museum tickets online in advance to
> skip long queues. Also download the official apps.

> [09:00] breakfast :: [Hotel Restaurant](https://example.com/hotel)

> [10:30] - [13:00] museum :: [Louvre Museum](https://example.com/louvre)
>
> - price: EUR 17
> - note: `skip-the-line` ticket purchased via official app

> [13:30] lunch :: [Café Example](https://example.com/cafe)
>
> - price: EUR 25

> [!WARNING] Public transport strikes
>
> Strikes are frequent in France's public transport system.
> Check service status before traveling.

> [15:00] - [17:00] sightseeing :: Eiffel Tower
>
> - price: EUR 26.80
> - note: Up to 2nd floor

> [18:30] dinner :: [Le Example Restaurant](https://example.com/restaurant)
>
> - price: EUR 65
> - note: **Course menu** reserved

> [pm] walk :: Stroll along the Seine

---

# Syntax Reference

Note: Titles (`title`), locations (`destination`), and body segments (`body`) support Markdown inline elements (links, emphasis, code, etc.).

A systematic explanation of TripMD syntax.

## 1. Basic Event Line Structure

All events are written in quote blocks starting with `>`.

```markdown
> [time] eventType title :: location/details
> - attribute: value
```

## 2. Event Types

Event types are automatically classified into three categories:

### Transportation

```markdown
> [10:00] flight AF187 :: HND - CDG          # Flight
> [14:00] train :: Tokyo Station - Kyoto     # Train
> [15:30] bus :: Airport - Hotel              # Bus  
> [16:00] taxi :: Restaurant - Hotel          # Taxi
> [09:00] subway :: Châtelet - Louvre         # Subway
> [10:00] ferry :: Main Island - Remote Isle  # Ferry
> [11:00] drive :: Rental car trip           # Drive
> [12:00] cablecar :: To summit station       # Cable car
```

### Stay

```markdown
> [15:00] hotel :: [Example Hotel](https://example.com)    # Hotel
> [18:00] ryokan :: Hot spring inn                        # Ryokan
> [14:00] hostel :: Youth hostel                          # Hostel
> [16:00] dormitory :: Guesthouse                         # Dormitory
> [15:00] stay :: Friend's house                          # Generic stay
```

### Activity

All other event types:

```markdown
> [10:00] museum :: Louvre Museum            # Museum
> [12:00] lunch :: Italian Restaurant         # Lunch
> [14:00] sightseeing :: Eiffel Tower        # Sightseeing
> [09:00] breakfast                          # Breakfast (title can be omitted)
> [15:00] shopping :: Department Store        # Shopping
> [16:00] cafe :: Coffee break               # Cafe
> [20:00] dinner :: Restaurant reservation    # Dinner
```

## 3. Time Notation

### Specific Times

```markdown
> [09:00] breakfast          # Basic form
> [09:00@Asia/Tokyo] lunch   # With timezone
> [09:00] - [11:30] meeting  # Time range
> [09:00+1] arrival          # +1 indicates next day
```

### Approximate Times

```markdown
> [am] activity   # Morning
> [pm] cafe       # Afternoon
> [] sightseeing  # Time TBD
```

## 4. Location Notation

### Single Location

```markdown
> [10:00] museum :: Louvre Museum
> [15:00] cafe :: [Café Example](https://example.com)
```

### Movement (From Point A to Point B)

```markdown
> [08:00] flight :: NRT - CDG                    # Dash format
> [10:00] train from Tokyo to Kyoto              # from-to format
```

### Activity

```markdown
> [14:00] museum :: [Example Museum](https://example.com)
> - note: Using official app with `skip-the-line`
```

### Accommodation

Write the accommodation name, and optionally add area or notes after `::`.

```markdown
> [15:00] hotel :: Example Paris
```

## 5. Attribute Keys

Lines starting with `- key: value` add detailed information to events.

### Common Attribute Keys

#### Pricing

```markdown
> - price: EUR 100          # Price (price/cost are auto-aggregated)
> - cost: 15000 JPY         # Cost (treated same as price)
```

#### Transportation

```markdown
> - class: Economy          # Seat class
> - seat: 32A               # Seat number
> - duration: 2h 30m        # Duration
> - platform: 5             # Platform
> - gate: 42                # Gate number
```

#### Accommodation

```markdown
> - check-in: 15:00         # Check-in time
> - check-out: 11:00        # Check-out time
> - room: Deluxe Twin       # Room type
> - wifi: Available         # WiFi availability
> - breakfast: Included     # Breakfast included
```

#### Booking & Notes

```markdown
> - reservation: Required   # Reservation info
> - url: https://example.com # Related URL
> - note: Cancelled if rain  # Notes/precautions
> - menu: Course meal       # Menu
> - tel: 03-1234-5678       # Phone number
```

## 6. Alerts

Alerts are written as quote blocks starting with `[!TYPE]`.

> [!NOTE] Note
>
> TripMD supports 5 alert types.

> [!CAUTION]
> France requires Type E power plugs.

> [!WARNING]
> Transport strikes may affect your schedule.

> [!TIP]
> Purchase museum tickets online to save waiting time.

> [!IMPORTANT]
> Keep your passport, cards, and insurance info secure.

## 7. Currency and Timezone Fallback

### Timezone Processing

Timezones are determined in the following priority:

1. **Individual event specification** - Highest priority

   ```markdown
   > [09:00@Asia/Tokyo] departure :: Narita Airport
   ```

2. **Date heading specification** - Default for that day

   ```markdown
   ## 2026-01-24 @Europe/Paris

   > [09:00] breakfast     # Interpreted as Europe/Paris
   ```

3. **Frontmatter** - Document-wide default

   ```yaml
   ---
   timezone: Asia/Tokyo
   ---
   ```

4. **Plugin options** - Processing configuration

   ```typescript
   .use(remarkItinerary, { tzFallback: 'Asia/Tokyo' })
   ```

### Currency Processing

Currency also follows fallback processing:

```yaml
---
currency: JPY              # Document default currency
---
```

```markdown
> [10:00] lunch ::
> - price: 1500            # Interpreted as JPY
> - price: EUR 25          # Explicitly specified as EUR
> - price: $30             # Interpreted as USD
```

### Ambiguous Time Expressions

`[am]` and `[pm]` are resolved based on policy settings:

```typescript
.use(remarkItinerary, {
  amHour: 9,    // [am] = 09:00
  pmHour: 15    // [pm] = 15:00
})
```

---

# Developer Information

## Installation and Basic Setup

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
  .use(remarkItineraryAlert)      // Add alert feature (must come before remarkItinerary)
  .use(remarkItinerary, {
    tzFallback: 'Asia/Tokyo',      // Default timezone
    currencyFallback: 'JPY',       // Default currency
    amHour: 9,                     // Time for [am]
    pmHour: 15                     // Time for [pm]
  });
```

## AST Node Structure

remark-itinerary adds the following custom nodes to the Markdown AST:

```typescript
interface ITMDEventNode {
  type: 'itmdEvent';
  eventType: string;                    // 'flight', 'hotel', etc.
  baseType: 'transportation' | 'stay' | 'activity';
  time?: {
    kind: 'none' | 'marker' | 'point' | 'range';
    // ... time information
  };
  title?: RichInline | null;           // Event title
  destination?: {                      // Location info
    kind: 'single' | 'dashPair' | 'fromTo';
    // ... location details
  };
  body?: ITMDBodySegment[];            // Attribute info etc.
}
```

## Implementing Custom Processing

```typescript
import { visit } from 'unist-util-visit';

const customPlugin = () => {
  return (tree) => {
    visit(tree, 'itmdEvent', (node) => {
      // Process event nodes
      if (node.eventType === 'flight') {
        // Extract flight information
        console.log('Flight found:', node.title);
      }
      
      // Aggregate price attributes
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

## React Usage Example

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

## Package Structure and License

- **remark-itinerary** - Core parser (MIT License)
- **remark-itinerary-alert** - Alert extension (MIT License)
- **@itinerary-md/editor** - React editor component (UNLICENSED)

## Resources

- GitHub: [cumuloworks/itinerary-md](https://github.com/cumuloworks/itinerary-md)  
- Demo: [https://tripmd.dev/](https://tripmd.dev/)
- npm: [remark-itinerary](https://www.npmjs.com/package/remark-itinerary)
