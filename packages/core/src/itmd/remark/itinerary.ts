import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { runPipeline } from '../pipeline/run';
import { makeDefaultServices, type Policy } from '../services';

export type ItmdRemarkOptions = Partial<Policy> & { timezone?: string; stayMode?: 'default' | 'header' };

export const remarkItinerary: Plugin<[ItmdRemarkOptions?], Root> = (policy: ItmdRemarkOptions = {}) => {
    return (tree: Root, file?: VFile) => {
        const sv = makeDefaultServices(policy, file);
        runPipeline(tree, file, sv);
    };
};
