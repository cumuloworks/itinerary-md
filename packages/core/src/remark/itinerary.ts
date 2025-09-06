import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { runPipeline } from '../pipeline/run.js';
import { makeDefaultServices, type Policy } from '../services/index.js';
import type { ITMDEventNode } from '../types.js';

export type ItmdRemarkOptions = Partial<Policy> & {
    timezone?: string;
    debug?: boolean;
};

export const remarkItinerary: Plugin<[ItmdRemarkOptions?], Root> = (policy: ItmdRemarkOptions = {}) => {
    return (tree: Root, file?: VFile) => {
        const sv = makeDefaultServices(policy, file);
        const newTree = runPipeline(tree, file, sv);
        // Apply the returned Root back to the original tree
        tree.children = newTree.children;
        tree.type = newTree.type;
        if (policy.debug) {
            try {
                visit(tree as unknown as { type: string }, 'itmdEvent', (n: ITMDEventNode) => {
                    console.log(n);
                });
            } catch {}
        }
    };
};
