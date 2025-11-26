import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeSwitcher() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn btn-ghost">
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
        </div>
    );
}
