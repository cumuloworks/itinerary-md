import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { runPipeline } from '../pipeline/run';
import { makeDefaultServices, type Policy } from '../services';
import type { ITMDEventNode } from '../types';

export type ItmdRemarkOptions = Partial<Policy> & { timezone?: string; stayMode?: 'default' | 'header'; debug?: boolean };

export const remarkItinerary: Plugin<[ItmdRemarkOptions?], Root> = (policy: ItmdRemarkOptions = {}) => {
    return (tree: Root, file?: VFile) => {
        const sv = makeDefaultServices(policy, file);
        runPipeline(tree, file, sv);
        if (policy.debug) {
            try {
                visit(tree as unknown as { type: string }, 'itmdEvent', (n: ITMDEventNode) => {
                    console.log(n);
                });
            } catch {}
        }
    };
};
