import type { Node, Parent } from 'mdast';
import type { Position } from 'unist';
import type { Services } from '../services';
import type { ITMDEventNode } from '../types';
import type { NormalizedHeader } from './normalize';

export function buildEventNode(header: NormalizedHeader, absorbed: Node[], pos: Position | undefined, _sv: Services): ITMDEventNode {
    const node: ITMDEventNode = {
        type: 'itmdEvent',
        eventType: header.eventType || 'unknown',
        title: header.title ?? null,
        destination: header.destination ?? null,
        time: header.time ?? undefined,
        positions: header.positions,
        // meta は assemble 側で list から抽出時にのみ設定する
        warnings: [],
        children: absorbed as Parent['children'],
        position: pos,
        version: '1',
    };
    return node;
}
