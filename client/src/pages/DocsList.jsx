import { useEffect, useState, useRef } from 'react';
import api from '../api/apiClient';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useAsync from '../hooks/useAsync';
import { DocCardSkeleton, InfoRow } from '../components/common.jsx';
import { FileText, Copy, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function DocsList() {
    const { user } = useAuth();
    const [docs, setDocs] = useState([]);
    const [filter, setFilter] = useState('owned');
    const docsAsync = useAsync();
    const [copySuccess, setCopySuccess] = useState('');
    const filterRef = useRef(filter);

    const handleCopy = (textToCopy, type) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopySuccess(`${type} copied!`);
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess(`Failed to copy ${type}.`);
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    useEffect(() => {
        filterRef.current = filter;
    }, [filter]);

    useEffect(() => {
        const fetchDocs = async () => {
            const endpoint = filterRef.current === 'owned' ? '/user/owned-docs' : '/user/shared-docs';
            const res = await api.get(endpoint);
            setDocs(res.data.docs || []);
        };

        docsAsync.run(fetchDocs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const DocListItem = ({ doc }) => (
        <Link to={`/docs/${doc.docId}`} className="group block">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                {doc.metadata?.title || 'Untitled Document'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                                {doc.docId}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {doc.revoked ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 rounded-full">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                <span className="text-xs font-medium text-red-700 dark:text-red-300">Revoked</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/20 rounded-full">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-300">Valid</span>
                            </div>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <div className="mb-8 animate-slide-in-up">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Documents</h1>
                    <p className="text-slate-600 dark:text-slate-400">Manage your issued and shared credentials</p>
                </div>

                {/* Your Identity Section */}
                <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-slide-in-up transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Your Identity</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Share this information to have documents issued or shared with you.</p>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">User ID</p>
                            <div className="flex items-center justify-between">
                                <code className="text-sm font-mono text-slate-900 dark:text-slate-100">{user.id}</code>
                                <button
                                    onClick={() => handleCopy(user.id, 'User ID')}
                                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 transition-smooth"
                                    title="Copy User ID"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Public Key</p>
                            <textarea
                                readOnly
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 resize-none focus:outline-none"
                                rows="4"
                                value={user.blockchainPublicKey}
                            />
                        </div>
                    </div>

                    {copySuccess && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300 animate-slide-in-down">
                            ✓ {copySuccess}
                        </div>
                    )}
                </div>

                {/* Documents Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                    {/* Tabs */}
                    <div className="border-b border-slate-200 dark:border-slate-800 px-6 flex">
                        <button
                            onClick={() => setFilter('owned')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${filter === 'owned'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            My Documents
                        </button>
                        <button
                            onClick={() => setFilter('shared')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ml-6 ${filter === 'shared'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            Shared With Me
                        </button>
                    </div>

                    {/* Content */}
                    {docsAsync.loading ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {Array.from({ length: 3 }).map((_, i) => <DocCardSkeleton key={i} />)}
                        </div>
                    ) : docs.length > 0 ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {docs.map((doc) => doc && <DocListItem key={doc.docId} doc={doc} />)}
                        </div>
                    ) : (
                        <div className="text-center p-12">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No documents found</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                {filter === 'owned' ? 'You have not uploaded any documents yet.' : 'No documents have been shared with you.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
