import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('theme') || 'light'; } catch (e) { return 'light'; }
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(`theme-${theme}`);
        // Ensure solid accent colors (no gradients)
        root.style.setProperty('--accent', '#0ea5a4');
        root.style.setProperty('--accent-2', '#0ea5a4');
        try { localStorage.setItem('theme', theme); } catch (e) { }
    }, [theme]);

    function toggleTheme() {
        setTheme((t) => (t === 'light' ? 'dark' : 'light'));
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export default ThemeContext;
