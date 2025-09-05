import type { PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';
export type ItmdAlertNode = {
    type: 'itmdAlert';
    variant: 'note' | 'tip' | 'important' | 'warning' | 'caution';
    title?: string;
    inlineTitle?: PhrasingContent[];
    children: any[];
    position?: any;
    data?: {
        hProperties?: Record<string, unknown>;
    };
};
/**
 * remarkItineraryAlert
 * Convert GitHub-style blockquote alerts (e.g. > [!NOTE]) into itmdAlert nodes
 */
export declare const remarkItineraryAlert: Plugin<[], Root>;
//# sourceMappingURL=remarkItineraryAlert.d.ts.map
