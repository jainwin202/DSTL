import { Link, NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import ThemeSwitcher from "./ThemeSwitcher";
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from "react";

export default function Navbar() {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (!user) return null;

    const navLinkClasses = ({ isActive }) =>
        `px-4 py-2 rounded-md text-sm font-medium transition-smooth ${isActive
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
        }`;

    return (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="h-16 flex items-center justify-between">
                    {/* Logo and Brand */}
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-linear-to-br from-blue-600 to-blue-700 group-hover:shadow-lg transition-shadow">
                            <span className="font-bold text-sm">EL</span>
                        </div>
                        <span className="font-bold text-lg text-slate-900 dark:text-slate-100 hidden sm:inline group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            EduLedger
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink to="/docs" className={navLinkClasses}>
                            My Documents
                        </NavLink>
                        {user.role === "issuer" && (
                            <NavLink to="/upload-doc" className={navLinkClasses}>
                                Issue Document
                            </NavLink>
                        )}
                        <NavLink to="/verify" className={navLinkClasses}>
                            Verify
                        </NavLink>
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher />

                        {/* User Menu - Desktop */}
                        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
                            <button
                                onClick={logout}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-smooth text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-smooth"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            ) : (
                                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden pb-4 border-t border-slate-200 dark:border-slate-800 animate-slide-in-down">
                        <nav className="flex flex-col gap-2 pt-4">
                            <NavLink to="/docs" onClick={() => setMobileMenuOpen(false)} className={navLinkClasses}>
                                My Documents
                            </NavLink>
                            {user.role === "issuer" && (
                                <NavLink to="/upload-doc" onClick={() => setMobileMenuOpen(false)} className={navLinkClasses}>
                                    Issue Document
                                </NavLink>
                            )}
                            <NavLink to="/verify" onClick={() => setMobileMenuOpen(false)} className={navLinkClasses}>
                                Verify
                            </NavLink>
                            <button
                                onClick={() => {
                                    logout();
                                    setMobileMenuOpen(false);
                                }}
                                className="px-4 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-smooth text-left flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
