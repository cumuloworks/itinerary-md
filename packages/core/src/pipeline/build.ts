import type { Node, Parent } from 'mdast';
import type { Position } from 'unist';
import type { Services } from '../services';
import type { ITMDEventNode } from '../types';
import type { NormalizedHeader } from './normalize';

const TRANSPORTATION_EVENT_TYPES = new Set(['flight', 'train', 'drive', 'ferry', 'bus', 'taxi', 'subway', 'cablecar', 'rocket', 'spaceship']);
const STAY_EVENT_TYPES = new Set(['stay', 'hotel', 'ryokan', 'hostel', 'dormitory']);

function determineBaseType(eventType: string | undefined): ITMDEventNode['baseType'] {
    const normalized = (eventType || '').toLowerCase();
    if (TRANSPORTATION_EVENT_TYPES.has(normalized)) return 'transportation';
    if (STAY_EVENT_TYPES.has(normalized)) return 'stay';
    return 'activity';
}

export function buildEventNode(header: NormalizedHeader, absorbed: Node[], pos: Position | undefined, _sv: Services): ITMDEventNode {
    const baseType = determineBaseType(header.eventType);
    const node: ITMDEventNode = {
        type: 'itmdEvent',
        eventType: header.eventType || 'unknown',
        baseType,
        title: header.title ?? null,
        destination: header.destination ?? null,
        time: header.time ?? undefined,
        positions: header.positions,
        body: null,
        // meta は assemble 側で list から抽出時にのみ設定する
        warnings: [],
        children: absorbed as Parent['children'],
        position: pos,
        version: '1',
    };
    return node;
}
