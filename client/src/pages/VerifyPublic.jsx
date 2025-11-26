import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/apiClient";
import { CheckCircle, XCircle, ShieldCheck, AlertTriangle, Loader } from 'lucide-react';

export default function VerifyPublic() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        api.get(`/verify/${id}`).then((res) => {
            if (!mounted) return;
            setData(res.data.entry || res.data);
        }).catch((err) => {
            if (!mounted) return;
            // Better error message handling
            const errorMessage =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                (err?.response?.status === 404 ? "Document not found on blockchain" : "Failed to fetch verification details.");
            setError(errorMessage);
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [id]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center py-12">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Verifying document...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Verification Failed</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-3">{error}</p>
                </div>
            );
        }

        if (data) {
            const isRevoked = data.revoked;
            return (
                <div className="space-y-8">
                    {/* Status */}
                    <div className="text-center">
                        {isRevoked ? (
                            <>
                                <XCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
                                <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">Document Revoked</h2>
                                <p className="text-slate-600 dark:text-slate-400 mt-2">This document is no longer valid.</p>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                                <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">Document Verified</h2>
                                <p className="text-slate-600 dark:text-slate-400 mt-2">Successfully verified on the blockchain ledger</p>
                            </>
                        )}
                    </div>

                    {/* Details */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Verification Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Document ID</p>
                                <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">{id}</code>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Issuer ID</p>
                                <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">{data.issuer}</code>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Owner ID</p>
                                <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">{data.owner}</code>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Content Hash</p>
                                <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">{data.hash}</code>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors py-12 px-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl animate-slide-in-up">
                {/* Header */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Document Verification</h1>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                    {renderContent()}
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        ← Return to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
