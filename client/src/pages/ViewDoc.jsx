import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/apiClient";
import useAuth from "../hooks/useAuth";
import Loading from "../components/Loading";
import useAsync from "../hooks/useAsync";
import { CheckCircle, XCircle, Download, Share2, ShieldAlert, AlertTriangle, Clock, User, Key, FileText, ArrowLeft } from 'lucide-react';

export default function ViewDoc() {
    const { id } = useParams();
    const { user } = useAuth();
    const [doc, setDoc] = useState(null);
    const [shareTo, setShareTo] = useState("");
    const [users, setUsers] = useState([]);
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [useManualKey, setUseManualKey] = useState(false);

    const fetchAsync = useAsync();
    const usersAsync = useAsync();
    const actionAsync = useAsync();

    const { run: runAction } = actionAsync;

    useEffect(() => {
        let mounted = true;
        fetchAsync.run(async () => {
            try {
                const res = await api.get(`/user/doc/${id}`);
                if (mounted) setDoc(res.data);
            } catch (err) {
                if (mounted) setDoc(null);
                console.error('Failed to fetch doc', err);
            }
        });

        usersAsync.run(async () => {
            try {
                const res = await api.get('/user/list');
                if (mounted && res.data?.users) setUsers(res.data.users);
            } catch (err) {
                console.error('Failed to fetch users', err);
            }
        });

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const downloadFile = () => runAction(async () => {
        const res = await api.get(`/user/download/${id}`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        const fileName = doc.metadata?.title ? `${doc.metadata.title.replace(/ /g, '_')}.pdf` : `${doc.docId}.pdf`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    const share = () => {
        setActionError('');
        setActionSuccess('');
        runAction(async () => {
            try {
                await api.post("/user/share", { docId: id, targetPubKey: shareTo });
                setActionSuccess("Document shared successfully!");
                setShareTo('');
            } catch (e) {
                setActionError('Share failed: ' + (e?.response?.data?.error || e.message));
            }
        });
    };

    const revoke = () => {
        if (!window.confirm('Are you sure you want to revoke this document? This action is irreversible.')) return;
        setActionError('');
        setActionSuccess('');
        runAction(async () => {
            try {
                await api.post("/user/revoke", { docId: id });
                setDoc(prev => ({ ...prev, revoked: true }));
                setActionSuccess("Document has been revoked.");
            } catch (e) {
                setActionError('Revoke failed: ' + (e?.response?.data?.error || e.message));
            }
        });
    };

    if (fetchAsync.loading) return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
            <Loading />
        </div>
    );

    if (!doc) return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center animate-slide-in-up">
                <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Not Found</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">The document you're looking for doesn't exist or you don't have permission to view it.</p>
                <Link to="/docs" className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-smooth">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Documents
                </Link>
            </div>
        </div>
    );

    const isOwner = user.id === doc.owner?._id;
    const isIssuer = user.role === "issuer";

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Back Link */}
                <Link to="/docs" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-8 text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Documents
                </Link>

                {/* Header */}
                <div className="mb-10 animate-slide-in-up">
                    <div className="flex items-start gap-4 mb-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                                {doc.metadata?.title || 'Untitled Document'}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 font-mono text-sm">{doc.docId}</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-4">
                        {doc.revoked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-full">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">Revoked</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-full">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-300">Valid</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Document Details */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Details</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Owner</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{doc.owner?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Issuer</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{doc.issuer?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <Key className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Content Hash</p>
                                        <code className="text-xs font-mono text-slate-900 dark:text-slate-100 break-all block mt-1">{doc.hash}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Metadata</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(doc.metadata).map(([key, value]) => (
                                        <div key={key} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value.toString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Blockchain History */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Blockchain History</h2>
                            <div className="space-y-4">
                                {doc.txHistory?.map(tx => (
                                    <div key={tx.txId} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </p>
                                            <code className="text-xs font-mono text-slate-600 dark:text-slate-400 block mt-1">{tx.txId}</code>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Actions Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Actions</h3>
                            <button
                                onClick={downloadFile}
                                disabled={actionAsync.loading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className="w-4 h-4" />
                                Download PDF
                            </button>
                        </div>

                        {/* Share Card */}
                        {(isIssuer || isOwner) && !doc.revoked && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Share Document</h3>
                                <div className="space-y-3">
                                    <select
                                        value={useManualKey ? '__manual__' : shareTo}
                                        onChange={(e) => {
                                            if (e.target.value === '__manual__') setUseManualKey(true);
                                            else { setUseManualKey(false); setShareTo(e.target.value); }
                                        }}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 text-sm transition-smooth"
                                    >
                                        <option value="">Select a user</option>
                                        {users.filter(u => u._id !== user.id).map(u => (
                                            <option key={u._id} value={u.blockchainPublicKey}>
                                                {u.name} ({u.email})
                                            </option>
                                        ))}
                                        <option value="__manual__">Enter key manually</option>
                                    </select>

                                    {useManualKey && (
                                        <textarea
                                            value={shareTo}
                                            onChange={(e) => setShareTo(e.target.value)}
                                            placeholder="Paste recipient's public key"
                                            rows="4"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 resize-none transition-smooth"
                                        />
                                    )}

                                    <button
                                        onClick={share}
                                        disabled={actionAsync.loading || !shareTo}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share
                                    </button>

                                    {actionSuccess && (
                                        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 animate-slide-in-down">
                                            ✓ {actionSuccess}
                                        </div>
                                    )}
                                    {actionError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 animate-slide-in-down">
                                            ✗ {actionError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Revoke Card */}
                        {isIssuer && !doc.revoked && (
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-6 transition-smooth">
                                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    Danger Zone
                                </h3>
                                <p className="text-sm text-red-700 dark:text-red-400 mb-4">Revoking is permanent and irreversible.</p>
                                <button
                                    onClick={revoke}
                                    disabled={actionAsync.loading}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-white dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Revoke Document
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
