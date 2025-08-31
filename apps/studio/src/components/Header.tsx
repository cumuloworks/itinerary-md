import { Info } from 'lucide-react';
import React from 'react';
import { AboutDialog } from './dialog/AboutDialog';

const HeaderComponent: React.FC = () => {
    return (
        <header className="mb-4 px-8">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl leading-tight text-blue-600">Itinerary MD Studio</h1>
                <div className="flex items-center gap-2 p-2">
                    <AboutDialog trigger={<Info size={20} />} />
                </div>
            </div>
        </header>
    );
};

export const Header = React.memo(HeaderComponent);
export default Header;
