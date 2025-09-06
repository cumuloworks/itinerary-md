import { DateTime } from "luxon";
import type React from "react";
import { Heading } from "../../itinerary/Heading";

export const ItmdHeadingBlock: React.FC<{
	node: any;
	commonDataProps: any;
	lastStaySegmentsByDate: Map<string, Array<{ text: string; url?: string }>>;
}> = ({ node, commonDataProps, lastStaySegmentsByDate }) => {
	const d = node as { dateISO?: string; timezone?: string };
	const date = d?.dateISO;
	const tz = d?.timezone;
	if (!date) return null;
	const prevStaySegments = (() => {
		try {
			const zone = tz || "UTC";
			const dt = DateTime.fromISO(date, { zone });
			const prevISO = dt.minus({ days: 1 }).toISODate();
			return prevISO ? lastStaySegmentsByDate.get(prevISO) : undefined;
		} catch {
			return undefined;
		}
	})();
	return (
		<div className="contents" {...commonDataProps}>
			<Heading date={date} timezone={tz} prevStaySegments={prevStaySegments} />
		</div>
	);
};
