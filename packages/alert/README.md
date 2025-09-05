# remark-itinerary-alert

Remark plugin that converts GitHub-style blockquote alerts (e.g. `> [!NOTE]`) into `itmdAlert` nodes.

Install:

```bash
npm i remark-itinerary-alert
```

Usage:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItineraryAlert from 'remark-itinerary-alert';
import remarkItinerary from 'remark-itinerary';

const processor = unified()
  .use(remarkParse)
  // IMPORTANT: run alert BEFORE remark-itinerary
  .use(remarkItineraryAlert)
  .use(remarkItinerary);
```

Demo: <https://tripmd.dev/>

License: MIT
