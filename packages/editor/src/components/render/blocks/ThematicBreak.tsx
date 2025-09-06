import type React from "react";

export const ThematicBreak: React.FC<{ commonDataProps: any }> = ({
	commonDataProps,
}) => {
	return <hr className="my-8 border-gray-300" {...commonDataProps} />;
};
