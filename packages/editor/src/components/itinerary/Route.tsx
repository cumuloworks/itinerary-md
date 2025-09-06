import { ArrowRight } from "lucide-react";
import type React from "react";
import { Location } from "./Location";
import type { TextSegment } from "./SegmentedText";

//

interface RouteProps {
	departure?: string;
	arrival?: string;
	departureUrl?: string;
	arrivalUrl?: string;
	departureSegments?: TextSegment[];
	arrivalSegments?: TextSegment[];
}

export const Route: React.FC<RouteProps> = ({
	departure,
	arrival,
	departureUrl,
	arrivalUrl,
	departureSegments,
	arrivalSegments,
}) => {
	const depSegments =
		departureSegments ||
		(departure
			? departureUrl
				? [{ text: departure, url: departureUrl }]
				: [{ text: departure }]
			: undefined);

	const arrSegments =
		arrivalSegments ||
		(arrival
			? arrivalUrl
				? [{ text: arrival, url: arrivalUrl }]
				: [{ text: arrival }]
			: undefined);

	return (
		<span className="flex items-center gap-2 flex-wrap">
			<Location segments={depSegments} />
			<span className="text-gray-400">
				<ArrowRight size={16} />
			</span>
			<Location segments={arrSegments} />
		</span>
	);
};
