import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { ShieldCheck, Search } from 'lucide-react';

export default function Verify() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [docId, setDocId] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!docId.trim()) {
            setError("Please enter a document ID");
            return;
        }

        navigate(`/verify/${docId.trim()}`);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8 animate-slide-in-up">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Verify Document</h1>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Enter a document ID to verify its authenticity on the blockchain
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 transition-smooth hover:border-slate-300 dark:hover:border-slate-700 animate-slide-in-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Document ID
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={docId}
                                    onChange={(e) => {
                                        setDocId(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="Enter document ID (e.g., 239caad4-166b-4ec4-b6b1-6992d02707b3)"
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                >
                                    <Search className="w-5 h-5" />
                                    Verify
                                </button>
                            </div>
                            {error && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How it works:</h3>
                            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Enter the document ID you want to verify</li>
                                <li>• We'll check the blockchain ledger for the document</li>
                                <li>• View the document status, issuer, and hash</li>
                                <li>• Verify authenticity and revocation status</li>
                            </ul>
                        </div>
                    </form>
                </div>

                {/* Example */}
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Example:</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Document IDs are typically long alphanumeric strings (UUIDs) that uniquely identify a document on the blockchain.
                    </p>
                    <code className="text-xs font-mono text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-3 rounded block break-all">
                        239caad4-166b-4ec4-b6b1-6992d02707b3
                    </code>
                </div>
            </div>
        </div>
    );
}
