# remark-itinerary

Remark plugin and helpers for parsing itinerary-like syntax into custom MDAST nodes.

Install:

```bash
npm i remark-itinerary
```

Basic usage:

```ts
import remarkItinerary from 'remark-itinerary';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const processor = unified().use(remarkParse).use(remarkItinerary);
```

Demo: <https://tripmd.dev/>

License: MIT
