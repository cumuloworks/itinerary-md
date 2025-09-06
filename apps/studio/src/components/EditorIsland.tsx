import { type FC, lazy, Suspense } from "react";
import { reactTelemetryAdapter } from "../telemetry-adapter";

// Lazy load the Editor to ensure it only loads on the client
const Editor = lazy(() =>
	import("@itinerary-md/editor").then((module) => ({
		default: module.Editor,
	})),
);

const EditorIsland: FC = () => {
	// Add client-side only guard
	if (typeof window === "undefined") {
		return null;
	}

	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-full text-gray-500">
					エディターを読み込み中...
				</div>
			}
		>
			<Editor
				storageKey="itinerary-md-content"
				samplePath="/sample_en.md"
				telemetry={reactTelemetryAdapter}
			/>
		</Suspense>
	);
};

export default EditorIsland;
