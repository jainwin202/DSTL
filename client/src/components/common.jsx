import { Copy } from 'lucide-react';

export const DocCardSkeleton = () => (
    <div className="px-4 py-4">
        <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-4 w-full">
                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-full">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
        </div>
    </div>
);

export const InfoRow = ({ label, value, onCopy, isTextArea }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 md:items-start gap-2 md:gap-4">
        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{label}</div>
        <div className="md:col-span-3 flex items-start gap-2">
            <div className="flex-grow">
                {isTextArea ? (
                    <textarea
                        readOnly
                        className="w-full text-sm font-mono bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md p-2 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        value={value}
                    />
                ) : (
                    <div className="w-full text-sm font-mono bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md p-2 text-slate-600 dark:text-slate-300 overflow-x-auto">
                        {value}
                    </div>
                )}
            </div>
            <button
                onClick={onCopy}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                aria-label={`Copy ${label}`}
            >
                <Copy className="w-4 h-4" />
            </button>
        </div>
    </div>
);
