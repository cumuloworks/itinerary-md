# remark-itinerary

Remark plugin and helpers for parsing itinerary-like syntax into custom MDAST nodes.

Install:

```bash
npm i remark-itinerary
```

Basic usage:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItinerary from 'remark-itinerary';

const processor = unified()
  .use(remarkParse)
  .use(remarkItinerary);
```

Demo: <https://tripmd.dev/>

License: MIT
