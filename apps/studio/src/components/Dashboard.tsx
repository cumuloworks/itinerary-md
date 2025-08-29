import { ArrowDown, Plane, Ticket, TrainFront, Utensils } from 'lucide-react';

interface DashboardProps {
    summary: {
        startDate?: string;
        endDate?: string;
        numDays?: number;
    };
    totalFormatted: string;
    breakdownFormatted: { transport: string; activity: string; meal: string };
    loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, totalFormatted, breakdownFormatted, loading }) => {
    return (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white">
                <div className="text-4xl font-bold text-emerald-600">{loading ? 'Calculating…' : totalFormatted}</div>
                <div className="w-full px-4 mt-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                                <Plane size={18} className="text-gray-600" />
                                <TrainFront size={18} className="text-gray-600" />
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{loading ? '—' : breakdownFormatted.transport}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Ticket size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{loading ? '—' : breakdownFormatted.activity}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Utensils size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{loading ? '—' : breakdownFormatted.meal}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="border border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white">
                <div className="text-3xl font-bold text-gray-800 flex flex-col justify-center items-center gap-1">
                    {summary.startDate && summary.endDate ? (
                        <>
                            <span>{summary.startDate}</span>
                            <div className="flex items-center gap-1">
                                <ArrowDown size={18} className="text-gray-600" />
                                <span className="text-sm text-gray-600">{summary.numDays ? <span className="text-sm text-gray-600">{summary.numDays} days</span> : null}</span>
                            </div>
                            <span>{summary.endDate}</span>
                        </>
                    ) : (
                        <span>—</span>
                    )}
                </div>
            </div>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="text-gray-500 text-sm">Map</div>
                <div className="mt-2 h-20 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm"></div>
            </div>
        </div>
    );
};

export default Dashboard;
