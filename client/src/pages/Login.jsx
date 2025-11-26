import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useAsync from "../hooks/useAsync";
import { AlertTriangle, LogIn } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const actionAsync = useAsync();
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        actionAsync.run(async () => {
            try {
                await login(email, password);
                navigate("/dashboard");
            } catch (e) {
                setError(e?.response?.data?.message || e.message || "Invalid credentials");
            }
        });
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 transition-colors">
            <div className="w-full max-w-md animate-slide-in-up">
                {/* Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-8 transition-colors">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 text-white mb-4 shadow-md">
                            <span className="font-bold text-lg">EL</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome to EduLedger</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Sign in to your account to continue</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-smooth"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-smooth"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-in-down">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={actionAsync.loading}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            {actionAsync.loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-medium">Demo Credentials:</p>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Issuer:</span>
                                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 font-mono">issuer@example.com / issuer123</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">User:</span>
                                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 font-mono">user@example.com / user123</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
