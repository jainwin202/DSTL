import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import useAuth from "../hooks/useAuth";
import useAsync from "../hooks/useAsync";
import { UploadCloud, AlertTriangle, User, FileUp } from 'lucide-react';

export default function UploadDoc() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [ownerId, setOwnerId] = useState("");
    const [metadata, setMetadata] = useState("");
    const [error, setError] = useState("");
    const actionAsync = useAsync();

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        actionAsync.run(async () => {
            try {
                let parsedMetadata = {};
                if (metadata) {
                    parsedMetadata = JSON.parse(metadata);
                }

                const form = new FormData();
                form.append("file", file);
                form.append("ownerId", ownerId);
                form.append("metadata", JSON.stringify(parsedMetadata));

                const res = await api.post("/issuer/upload", form, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                alert("Document issued successfully!");
                navigate(`/docs/${res.data.docId}`);
            } catch (err) {
                if (err instanceof SyntaxError) {
                    setError("Metadata is not valid JSON. Please use correct JSON format.");
                } else {
                    setError(err.response?.data?.error || "An error occurred during upload.");
                }
            }
        });
    }

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors py-8 sm:py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-8 animate-slide-in-up">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                            <FileUp className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Issue Document</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Upload and issue a new document to the blockchain ledger</p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                    <form onSubmit={handleSubmit} className="space-y-7">
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Document File
                            </label>
                            <label htmlFor="file-upload" className="relative cursor-pointer">
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/10 transition-smooth">
                                    <UploadCloud className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                        Click to upload or drag and drop
                                    </p>
                                    {fileName && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                                            ✓ {fileName}
                                        </p>
                                    )}
                                </div>
                            </label>
                            <input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} required />
                        </div>

                        {/* Owner ID */}
                        <div>
                            <label htmlFor="ownerId" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Recipient User ID
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="ownerId"
                                    placeholder="Paste the recipient's user ID"
                                    value={ownerId}
                                    onChange={(e) => setOwnerId(e.target.value)}
                                    required
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-smooth"
                                />
                                <button
                                    type="button"
                                    onClick={() => setOwnerId(user.id)}
                                    title="Issue to myself"
                                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-smooth flex items-center gap-2"
                                >
                                    <User className="w-4 h-4" />
                                    <span className="text-xs font-medium hidden sm:inline">Me</span>
                                </button>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div>
                            <label htmlFor="metadata" className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Metadata (JSON format)
                            </label>
                            <textarea
                                id="metadata"
                                placeholder={`{\n  "title": "Bachelor of Science Degree",\n  "major": "Computer Science",\n  "gpa": "3.85",\n  "graduationDate": "2024-05-15"\n}`}
                                value={metadata}
                                onChange={(e) => setMetadata(e.target.value)}
                                required
                                rows="6"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none transition-smooth"
                            />
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-slide-in-down">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Error</p>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={actionAsync.loading || !file}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <FileUp className="w-5 h-5" />
                            {actionAsync.loading ? "Issuing..." : "Issue Document"}
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-sm text-slate-600 dark:text-slate-400">
                    Issuing as <span className="font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
                </div>
            </div>
        </div>
    );
}
