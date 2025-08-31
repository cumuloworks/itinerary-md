import { Info } from 'lucide-react';
import React from 'react';
import { AboutDialog } from './dialog/AboutDialog';

const HeaderComponent: React.FC = () => {
    return (
        <header className="mb-4 px-8">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl leading-tight text-blue-600">Itinerary MD Studio</h1>
                <div className="flex items-center gap-2 p-2">
                    <AboutDialog
                        trigger={
                            <button
                                type="button"
                                aria-label="About"
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                <Info size={20} />
                            </button>
                        }
                    />
                </div>
            </div>
        </header>
    );
};

export const Header = React.memo(HeaderComponent);
export default Header;
