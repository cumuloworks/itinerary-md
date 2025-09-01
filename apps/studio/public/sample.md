---
type: itmd
title: Tokyo to Barcelona Adventure
timezone: Asia/Tokyo
currency: EUR
description: A comprehensive 3-day journey from Tokyo to Barcelona showcasing itinerary-md features
traveler: Emma Johnson
budget: 2500 EUR
tags: europe, spain, culture, gastronomy
---

# Tokyo to Barcelona: A Mediterranean Escape

## 2025-03-15 @Asia/Tokyo

[06:30] breakfast Traditional Japanese breakfast at hotel
- price: JPY 1800
- note: Last taste of Japan before departure

[08:00] taxi Airport Limousine :: Hotel - Narita Terminal 1
- price: JPY 3200
- duration: 70 minutes
- tag: reserved

[11:35@Asia/Tokyo] - [18:45@Europe/Madrid] flight IB6800 :: NRT - MAD
- seat: 23A
- aircraft: Airbus A350-900
- airline: Iberia
- price: EUR 890
- meal: included
- tag: business-class

_✈️ Crossing 8 time zones westward. The `@Timezone` notation shows local times at departure and arrival._

[20:30@Europe/Madrid] - [22:50@Europe/Madrid] flight IB2718 :: MAD - BCN
- seat: 8F
- aircraft: Airbus A321
- price: EUR 125
- tag: economy

[23:30] taxi Airport Express :: BCN Terminal 1 - Hotel Casa Fuster
- price: EUR 35
- distance: 13km

[] hotel Casa Fuster :: Gran de Gràcia 132, Barcelona
- checkin: 00:00
- checkout: 2025-03-18
- room: Deluxe Suite
- reservation: BCN-2025-EJ-7823
- price: EUR 320/night

## 2025-03-16 @Europe/Madrid

[09:00] brunch at Brunch & Cake
- location: Carrer d'Enric Granados 19
- price: EUR 28
- cuisine: Mediterranean fusion
- note: Famous for their Instagram-worthy dishes

[11:00] - [14:30] activity Sagrada Família guided tour
- price: EUR 47
- guide: English
- includes: Tower access
- booking: SF-2025-03-16-AM

[pm] museum Picasso Museum :: Carrer Montcada 15-23
- price: EUR 12
- collection: 4,251 works
- audio-guide: EUR 5

[16:00] cafe Coffee break :: Nomad Coffee
- price: EUR 8
- specialty: Single origin Ethiopian

[17:30] - [19:00] activity Walking tour of Gothic Quarter
- price: EUR 0
- note: Free walking tour (tips appreciated)
- meeting: Plaça de Catalunya

[20:00] shopping La Boqueria Market
- budget: EUR 40
- goal: Local products and souvenirs

[21:30] dinner Traditional tapas at Cal Pep
- location: Plaça de les Olles 8
- price: EUR 65
- recommended: Seafood tapas
- reservation: 21:30

[] hotel Casa Fuster

## 2025-03-17 @Europe/Madrid

[08:30] breakfast at hotel
- price: included
- style: Continental buffet

[10:00] - [11:30] subway L3 Green Line :: Diagonal - Vallcarca
- price: EUR 2.40
- destination: Park Güell

[11:30] - [14:00] park Park Güell exploration
- price: EUR 10
- zone: Monumental Core
- architect: Antoni Gaudí

[14:30] lunch Paella lunch :: Can Solé
- location: Sant Carles 4, Barceloneta
- price: EUR 42
- specialty: Seafood paella
- established: 1903

[16:00] - [17:30] activity Beach time at Barceloneta
- price: EUR 0
- activity: Swimming and sunbathing

[18:00] spa Aire Ancient Baths Barcelona
- price: EUR 95
- package: 90-minute thermal circuit
- includes: 6 thermal baths + relaxation area

[20:30] activity Flamenco show :: Tablao Flamenco Cordobés
- price: EUR 45
- duration: 1 hour
- includes: 1 drink

[22:00] dinner Late dinner :: Tickets Bar
- price: EUR 120
- style: Molecular tapas
- chef: Albert Adrià
- reservation: required months ahead

[23:45] - [00:30+1] activity Night walk along Las Ramblas
- price: EUR 0
- note: Experience Barcelona's nightlife

[] hotel Casa Fuster

---

# Understanding itinerary-md Syntax

## Overview

**itinerary-md** is a Markdown extension designed for creating structured travel itineraries. It uses a simple, human-readable syntax that compiles into rich, interactive travel plans.

## Core Concepts

### 1. **Date Headers**

Date headers define the day and optionally the timezone context:

```markdown
## 2025-03-15 @Asia/Tokyo
```

- Format: `## YYYY-MM-DD [@Timezone]`
- The `@Timezone` is optional and sets the display timezone for that day
- All times under this header will be interpreted in this timezone unless specified otherwise

### 2. **Time Notation**

Times can be specified in various formats:

- **Exact time**: `[14:30]` - 2:30 PM
- **Time range**: `[09:00] - [17:00]` - 9 AM to 5 PM
- **Timezone-specific**: `[11:35@Asia/Tokyo]` - 11:35 AM Tokyo time
- **Day crossing**: `[23:00] - [01:00+1]` - 11 PM to 1 AM next day
- **Approximate times**:
  - `[am]` - Morning (unspecified)
  - `[pm]` - Afternoon/evening (unspecified)
  - `[]` - Time TBD

### 3. **Event Types**

#### Transportation Events
```markdown
[time] flight|train|bus|ferry|taxi|subway|drive NAME :: DEPARTURE - ARRIVAL
```

Examples:
- `[11:35] flight IB6800 :: NRT - MAD`
- `[10:00] train Eurostar :: London - Paris`
- `[08:00] taxi Airport Express :: Hotel - Airport`

#### Accommodation Events
```markdown
[] stay|hotel|hostel|ryokan|dormitory NAME :: LOCATION
```

Examples:
- `[] hotel Casa Fuster :: Barcelona`
- `[] stay Airbnb :: Shibuya, Tokyo`
- `[] ryokan Traditional Inn :: Kyoto`

#### Activity Events
```markdown
[time] activity|meal|museum|shopping|spa|park|cafe DESCRIPTION [at LOCATION]
```

Examples:
- `[14:00] activity Sagrada Família tour`
- `[12:00] lunch Paella at Can Solé`
- `[10:00] museum Louvre :: Paris`

### 4. **Event Aliases**

For more natural language, these aliases map to base types:

**Meal aliases** → `meal`:
- `breakfast`, `lunch`, `dinner`, `brunch`

**Activity aliases** → `activity`:
- `museum`, `sightseeing`, `shopping`, `spa`, `park`, `cafe`

**Stay aliases** → `stay`:
- `hotel`, `hostel`, `ryokan`, `dormitory`

### 5. **Location Syntax**

Two ways to specify locations:

1. **Using `at`**: `[12:00] lunch Pizza at Mario's Restaurant`
2. **Using `::`**: `[12:00] lunch Pizza :: Mario's Restaurant`

When using aliases with simplified syntax:
- `[08:00] breakfast at Café Luna` → Name: "Breakfast", Location: "Café Luna"
- `[12:00] lunch :: Quick Bite` → Name: "Lunch", Location: "Quick Bite"

### 6. **Metadata Fields**

Events support metadata as indented key-value pairs:

```markdown
[11:35] flight IB6800 :: NRT - MAD
- seat: 23A
- aircraft: Airbus A350
- price: EUR 890
- meal: included
- tag: business-class
```

Common metadata fields:
- `price`: Cost of the event
- `note`: Additional information
- `tag`: Labels for categorization
- `reservation`: Booking reference
- `duration`: Time length
- `distance`: Travel distance

### 7. **Timezone Handling**

When times include timezone information:

```markdown
[11:35@Asia/Tokyo] - [18:45@Europe/Madrid] flight IB6800 :: NRT - MAD
```

This shows:
- Departure: 11:35 AM Tokyo time
- Arrival: 6:45 PM Madrid time
- Automatic timezone conversion display

### 8. **Frontmatter**

YAML frontmatter provides document-level metadata:

```yaml
---
type: itmd
title: Trip Title
timezone: Default/Timezone
currency: EUR
description: Trip description
traveler: Name
budget: Amount
tags: tag1, tag2
---
```

## Advanced Features

### Multi-day Events

For events spanning multiple days, use the `+N` notation:

```markdown
[22:00] - [10:00+1] ferry Overnight Ferry :: Helsinki - Stockholm
```

### Contextual Inheritance

When multiple similar events occur, subsequent events can inherit context:

```markdown
[] hotel Marriott :: Downtown
- checkin: 15:00
- checkout: 2025-03-20

## 2025-03-18
[] hotel Marriott  # Inherits location from previous day
```

### Price Aggregation

The parser can aggregate prices across events for budget tracking:

```markdown
[12:00] lunch Restaurant
- price: EUR 25
- tip: EUR 5  # Both counted toward daily spending
```

## Best Practices

1. **Use consistent timezone notation** - Specify timezone in date headers for clarity
2. **Include prices** - Helps with budget tracking
3. **Add reservation numbers** - Keep booking references with events
4. **Use appropriate event types** - Helps with categorization and visualization
5. **Leverage aliases** - Makes the document more readable
6. **Document uncertain times** - Use `[]` or `[am]/[pm]` for flexible scheduling

## Example Patterns

### Morning routine
```markdown
[07:00] breakfast at hotel
[08:30] activity Morning jog
[09:30] cafe Coffee :: Local Café
```

### Day trip
```markdown
[08:00] - [10:00] train Express :: City A - City B
[10:30] - [16:00] activity Full day tour
[16:30] - [18:30] train Express :: City B - City A
```

### Evening entertainment
```markdown
[19:00] dinner Fine dining :: Michelin Restaurant
[21:00] activity Theater show :: Broadway
[23:00] activity Night walk :: Times Square
```

---

_This document demonstrates the complete itinerary-md syntax. For more examples and live preview, visit the itinerary-md studio._