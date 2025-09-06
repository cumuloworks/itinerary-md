import type { Root } from 'mdast';
import type { Services } from '../services/index.js';
import { assembleEvents } from './assemble.js';

export function runPipeline(root: Root, _file: unknown, sv: Services): Root {
    return assembleEvents(root, sv);
}
