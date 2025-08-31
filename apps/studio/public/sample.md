---
title: Europe Trip (First 3 Days)
timezone: Asia/Tokyo
---

## 2025-09-25 @Asia/Tokyo

[08:00] activity Meet at Haneda Terminal 3

[09:45@Asia/Tokyo] - [15:50@Europe/London] flight JL043 :: HND - LHR
    - seat: 50A
    - aircraft: Airbus A350

[pm] activity Buy UK SIM at airport
    - price: GBP 20

[] stay Premier Inn London City, Tower Hill
    - checkin: 16:30
    - reservation: LON-ABC123

_Note: Mixed `@Timezone` in a range shows conversion; you may see +Nd badges when crossing days._

## 2025-09-26 @Europe/London

[08:30] meal Breakfast at Dishoom
    - price: GBP 12
    - note: Using new 'at' syntax for meals

[10:00] - [11:30] train Elizabeth Line :: Liverpool Street - Paddington
    - vehicle: Class 345
    - tag: reserved
    - price: GBP 13.20

[12:30] meal Quick lunch at Pret A Manger
    - price: GBP 8

[14:00] activity Shopping at Covent Garden
    - price: GBP 40
    - note: souvenirs and gifts

[] activity Free time
    - note: Explore West End

[19:30] meal Fish & Chips :: Soho
    - price: GBP 18
    - note: Using traditional '::' syntax

[23:15] - [00:05+1] activity Late-night walk along the Thames
    - price: GBP 0

[] stay Premier Inn London City, Tower Hill

## 2025-09-27 @Europe/London

[09:01@Europe/London] - [12:17@Europe/Paris] train Eurostar 9027 :: London - Paris
    - seat: 7A
    - tag: reserved
    - price: GBP 89

[13:30] meal Lunch at Café de Flore
    - price: EUR 28
    - cuisine: French

[pm] activity Louvre visit at Paris
    - price: EUR 22

[20:00] meal Dinner at Le Comptoir du Relais
    - price: EUR 45
    - note: Traditional French bistro

[] stay Hôtel Tourisme Avenue, Paris
    - checkin: 15:00

---

## Tips

- Add `@Timezone` to a date heading to change display TZ for that day.
- Use `[]` for TBD time; `[am]`/`[pm]` are broad time labels.
- For `activity` and `meal` types, you can use "at" to specify location:
  - `meal Breakfast at Dishoom` → restaurant: "Breakfast", location: "Dishoom"
  - `activity Shopping at Covent Garden` → activity: "Shopping", location: "Covent Garden"
- Traditional `::` syntax still works: `meal Breakfast :: Dishoom`
