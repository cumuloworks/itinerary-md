import { Editor } from "@itinerary-md/editor";
import { reactTelemetryAdapter } from "../telemetry-adapter";

export default function EditorIsland() {
	return (
		<Editor
			storageKey="itinerary-md-content"
			samplePath="/sample_en.md"
			telemetry={reactTelemetryAdapter}
		/>
	);
}
