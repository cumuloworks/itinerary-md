import type { Services } from "../services/index.js";
import type { NormalizedHeader } from "./normalize.js";

export function validateHeader(
	h: NormalizedHeader,
	_sv: Services,
): { header: NormalizedHeader; warnings: string[] } {
	const warnings: string[] = [];
	if (!h.eventType) warnings.push("Missing event type");
	return { header: h, warnings };
}
