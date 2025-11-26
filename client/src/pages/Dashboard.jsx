import useAuth from "../hooks/useAuth";
import { Link } from 'react-router-dom';
import { Upload, FileText, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    const actionCards = [
        {
            title: "Upload & Issue Document",
            description: "Create and issue new documents to the blockchain ledger.",
            link: "/upload-doc",
            icon: Upload,
            gradient: "from-blue-500 to-blue-600",
            role: "issuer"
        },
        {
            title: "View My Documents",
            description: "Browse, manage and verify your owned and shared documents.",
            link: "/docs",
            icon: FileText,
            gradient: "from-green-500 to-green-600",
            role: null
        },
        {
            title: "Verify Document",
            description: "Validate and check the authenticity of any document.",
            link: "/verify",
            icon: ShieldCheck,
            gradient: "from-purple-500 to-purple-600",
            role: null
        }
    ];

    const filteredCards = actionCards.filter(card => card.role === null || card.role === user.role);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                <div className="animate-slide-in-up">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Welcome back, <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.name}</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-8">
                        Manage your digital documents on a secure, immutable blockchain ledger. Issue, verify, and share credentials with confidence.
                    </p>
                </div>

                {/* Action Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {filteredCards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <Link
                                to={card.link}
                                key={idx}
                                className="group relative h-full"
                            >
                                {/* Card Background Glow */}
                                <div className={`absolute inset-0 bg-linear-to-br ${card.gradient} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300 blur-xl`} />

                                {/* Card Content */}
                                <div className="relative h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col transition-smooth hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-200 dark:hover:shadow-slate-800/50">
                                    {/* Icon */}
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-br ${card.gradient} text-white mb-4 group-hover:shadow-lg transition-shadow`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {card.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-1">
                                        {card.description}
                                    </p>

                                    {/* CTA */}
                                    <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                        Get started
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Profile Section */}
                <div className="max-w-3xl mx-auto animate-slide-in-up">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 transition-smooth hover:border-slate-300 dark:hover:border-slate-700">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Your Profile
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                            Your account information and blockchain credentials
                        </p>

                        {/* Profile Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: "Name", value: user.name },
                                { label: "Email", value: user.email },
                                { label: "Role", value: user.role === "issuer" ? "🏛️ Issuer" : "👤 User" }
                            ].map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                        {item.label}
                                    </p>
                                    <p className="text-slate-900 dark:text-slate-100 font-medium break-all">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Blockchain ID */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                Blockchain Public Key
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-3 font-mono text-xs text-slate-700 dark:text-slate-300 break-all line-clamp-2">
                                {user.blockchainPublicKey}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Use this key to have documents issued or shared with you.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
