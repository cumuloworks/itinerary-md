// Register all itinerary-related completion providers for Monaco
// This aggregates date, time, event type, destination, alert, and price completions.

import { registerAlertCompletion } from './alert';
import { registerDateCompletion } from './date';
import { registerDestinationCompletion } from './destination';
import { registerEventTypeCompletion } from './eventType';
import { registerPriceCompletion } from './price';
import { registerQuickInsertCompletion } from './quickInsert';
import { registerTimeCompletion } from './time';

export function registerItineraryCompletions(monaco: any): { dispose: () => void } {
    const disposables: Array<{ dispose: () => void } | null | undefined> = [];
    try {
        disposables.push(registerDateCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerQuickInsertCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerTimeCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerEventTypeCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerDestinationCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerAlertCompletion(monaco));
    } catch {}
    try {
        disposables.push(registerPriceCompletion(monaco));
    } catch {}

    return {
        dispose: () => {
            for (const d of disposables) {
                try {
                    d?.dispose?.();
                } catch {}
            }
        },
    };
}
