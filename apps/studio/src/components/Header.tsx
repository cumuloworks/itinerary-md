import { Info } from 'lucide-react';
import type React from 'react';
import { AboutDialog } from './dialog/AboutDialog';

export const Header: React.FC = () => {
    return (
        <header className="mb-4 px-8">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl leading-tight text-blue-600">Itinerary MD Studio</h1>
                <div className="flex items-center gap-2">
                    <AboutDialog
                        trigger={
                            <button type="button" aria-label="About" className="inline-flex items-center justify-center w-8 h-8 text-gray- hover:bg-gray-50">
                                <Info size={16} />
                            </button>
                        }
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
