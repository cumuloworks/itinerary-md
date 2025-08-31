import { ArrowDown, Plane, Ticket, TrainFront, Utensils } from 'lucide-react';

interface StatisticsProps {
    summary: {
        startDate?: string;
        endDate?: string;
        numDays?: number;
    };
    totalFormatted: string | null;
    breakdownFormatted: { transport: string; activity: string; meal: string } | null;
}

export const Statistics: React.FC<StatisticsProps> = ({ summary, totalFormatted, breakdownFormatted }) => {
    return (
        <div className="flex flex-wrap justify-evenly py-4 rounded bg-gray-50 border border-gray-300">
            <div className="basis-1/2 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-emerald-600">{totalFormatted ?? '—'}</div>
                <div className="w-full px-4 mt-2">
                    <div className="flex justify-center gap-x-10 text-center">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                                <Plane size={18} className="text-gray-600" />
                                <TrainFront size={18} className="text-gray-600" />
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.transport ?? '—'}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Ticket size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.activity ?? '—'}</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Utensils size={20} className="text-gray-600" />
                            <div className="text-sm font-semibold text-gray-800">{breakdownFormatted?.meal ?? '—'}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="basis-1/2 p-4 rounded-lg flex flex-col items-center justify-center ">
                <div className="text-2xl whitespace-nowrap font-bold text-gray-800 flex flex-col justify-center items-center gap-1">
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
        </div>
    );
};

export default Statistics;
