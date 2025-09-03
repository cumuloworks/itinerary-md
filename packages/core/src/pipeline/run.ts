import type { Root } from 'mdast';
import type { Services } from '../services';
import { assembleEvents } from './assemble';

export function runPipeline(root: Root, _file: unknown, sv: Services): Root {
    return assembleEvents(root, sv);
}
