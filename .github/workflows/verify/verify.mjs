import { unified } from 'unified';
import remarkParse from 'remark-parse';
// Minimal pipeline: parse -> alert -> itinerary -> compare with golden JSON
import itinerary from 'remark-itinerary';
import itineraryAlert from 'remark-itinerary-alert';
import { visit } from 'unist-util-visit';
import fs from 'node:fs/promises';
import process from 'node:process';

// Read input markdown
const md = await fs.readFile('./input.md', 'utf8');

// Build processor
const processor = unified().use(remarkParse).use(itineraryAlert).use(itinerary);

// Transform
const parsed = processor.parse(md);
const transformed = await processor.run(parsed);

// Collect only nodes we care about and drop positional info from unist
const collected = [];
visit(transformed, (node) => {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'itmdAlert' || node.type === 'itmdEvent' || node.type === 'itmdHeading') {
    const sanitized = JSON.parse(
      JSON.stringify(node, (key, value) => (key === 'position' ? undefined : value))
    );
    collected.push(sanitized);
  }
});

// Load expected JSON
const expected = JSON.parse(await fs.readFile('./output.json', 'utf8'));

// Deep equality comparison (recursively compares arrays and plain objects)
function previewString(s) {
  const max = 80;
  const body = s.length > max ? `${s.slice(0, max)}…` : s;
  return JSON.stringify(body);
}

function humanDescribe(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return `string ${previewString(value)}`;
  if (t === 'number') return `number ${value}`;
  if (t === 'boolean') return `boolean ${value}`;
  if (t === 'undefined') return 'undefined';
  if (Array.isArray(value)) return `array(len=${value.length})`;
  return `object(keys=${Object.keys(value).length})`;
}

function deepEqual(a, b, path = '') {
  const here = path || '<root>';
  console.log(`compare @ ${here}: ${humanDescribe(a)} vs ${humanDescribe(b)}`);

  if (a === b) {
    console.log(`equal (strict) @ ${here}: ${humanDescribe(a)}`);
    return true;
  }

  if (Number.isNaN(a) && Number.isNaN(b)) {
    console.log(`equal (NaN) @ ${here}`);
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray !== bIsArray) {
      console.log(`type mismatch (array vs object) @ ${here}: ${humanDescribe(a)} vs ${humanDescribe(b)}`);
      return false;
    }
    if (aIsArray) {
      if (a.length !== b.length) {
        console.log(`array length mismatch @ ${here}: ${a.length} !== ${b.length}`);
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        const childPath = `${here === '<root>' ? '' : here}[${i}]` || `[${i}]`;
        console.log(`descend array @ ${childPath}`);
        if (!deepEqual(a[i], b[i], childPath)) return false;
      }
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      console.log(`object key count mismatch @ ${here}: ${aKeys.length} !== ${bKeys.length}`);
      return false;
    }
    for (const key of aKeys) {
      if (!Object.hasOwn(b, key)) {
        console.log(`missing key in rhs @ ${here}: ${key}`);
        return false;
      }
      const childPath = here === '<root>' ? key : `${here}.${key}`;
      console.log(`descend object @ ${childPath}`);
      if (!deepEqual(a[key], b[key], childPath)) return false;
    }
    return true;
  }

  console.log(`not equal @ ${here}: ${humanDescribe(a)} vs ${humanDescribe(b)}`);
  return false;
}

if (!deepEqual(collected, expected)) {
  console.error('Test failed: actual output does not match output.json');
  await fs.writeFile('actual.json', JSON.stringify(collected, null, 2));
  console.error('Wrote actual result to actual.json for inspection');
  process.exit(1);
}

console.log('Test passed: actual output matches output.json');
