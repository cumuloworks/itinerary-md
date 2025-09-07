import type React from 'react';
import { mergeClassNames } from '@/components/render/utils';

export const ThematicBreak: React.FC<{ commonDataProps: any }> = ({ commonDataProps }) => {
    const { className: extraClass, ...rest } = commonDataProps || {};
    const mergedClassName = mergeClassNames('my-8 border-gray-300', extraClass as string | undefined);
    return <hr className={mergedClassName} {...rest} />;
};
