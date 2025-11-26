export default function Loading({ compact = false, animate = true } = {}) {
    // animate: whether the progress bar should animate (indeterminate)
    return (
        <div className={`flex items-center justify-center p-6 ${compact ? 'py-2' : ''}`}>
            <div className="flex flex-col items-center gap-3">
                <svg className={`text-gray-600 ${animate ? 'animate-spin' : ''}`} width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.12" strokeWidth="3"></circle>
                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path>
                </svg>
                <div className="w-40 progress-wrap rounded-full overflow-hidden">
                    <div className={`progress ${animate ? 'active' : ''}`}></div>
                </div>
            </div>
        </div>
    );
}
