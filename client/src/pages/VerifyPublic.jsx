import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

export default function VerifyPublic() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        api.get(`/verify/${id}`).then((res) => {
            if (!mounted) return;
            setData(res.data.entry || res.data);
        }).catch((err) => {
            if (!mounted) return;
            setError(err?.response?.data?.message || "Failed to fetch verification");
        });
        return () => { mounted = false; };
    }, [id]);

    if (error) return <p className="p-6 text-red-600">{error}</p>;
    if (!data) return <p className="p-6">Loading...</p>;

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold">Document Verification</h1>

            <p><b>Document ID:</b> {id}</p>
            <p><b>Issuer:</b> {data.issuer}</p>
            <p><b>Owner:</b> {data.owner}</p>
            <p><b>SHA256:</b> {data.hash}</p>

            {data.revoked ? (
                <p className="text-red-600 font-bold mt-4">⚠️ This document has been revoked</p>
            ) : (
                <p className="text-green-600 font-bold mt-4">✅ Document is valid</p>
            )}
        </div>
    );
}
