import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";
import useAuth from "../hooks/useAuth";

export default function DocsList() {
    const { user } = useAuth();
    const [docs, setDocs] = useState(null);

    useEffect(() => {
        let mounted = true;
        api.get("/user/docs").then((res) => {
            if (mounted) setDocs(res.data.docs || []);
        }).catch(() => {
            if (mounted) setDocs([]);
        });
        return () => { mounted = false; };
    }, []);

    if (!docs) return <p className="p-6">Loading...</p>;

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">
                {user.role === "issuer" ? "Documents Issued" : "My Documents"}
            </h1>

            {docs.length === 0 && <p>No documents found.</p>}

            <div className="space-y-3">
                {docs.map((d) => (
                    <Link
                        key={d.docId}
                        to={`/docs/${d.docId}`}
                        className="block bg-white p-3 rounded shadow hover:bg-gray-50"
                    >
                        <b>{d.metadata?.title || d.docId}</b>
                        <div className="text-xs text-gray-500">
                            {d.revoked ? (
                                <span className="text-red-600 font-bold">REVOKED</span>
                            ) : (
                                <span className="text-green-600 font-bold">VALID</span>
                            )}
                        </div>
                        <div className="text-xs opacity-70">{d.docId}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
