import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";
import useAuth from "../hooks/useAuth";

export default function ViewDoc() {
    const { id } = useParams();
    const { user } = useAuth();
    const [doc, setDoc] = useState(null);
    const [shareTo, setShareTo] = useState("");

    useEffect(() => {
        let mounted = true;
        api.get(`/user/doc/${id}`).then((res) => {
            if (mounted) setDoc(res.data);
        }).catch(() => {
            if (mounted) setDoc(null);
        });
        return () => { mounted = false; };
    }, [id]);

    async function downloadFile() {
        const res = await api.get(`/user/download/${id}`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.docId + ".pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function share() {
        await api.post("/user/share", { docId: id, targetPubKey: shareTo });
        alert("Shared!");
    }

    async function revoke() {
        await api.post("/user/revoke", { docId: id });
        alert("Revoked!");
    }

    if (!doc) return <p>Loading...</p>;

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-xl font-bold mb-2">{doc.metadata?.title || doc.docId}</h1>

            <p><b>Issued By:</b> {doc.issuer?.email}</p>
            <p><b>Owner:</b> {doc.owner?.email}</p>
            <p><b>Hash:</b> <code>{doc.hash}</code></p>

            <button onClick={downloadFile} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">Download PDF</button>

            <hr className="my-4" />

            {user.role === "issuer" || user.id === doc.owner._id ? (
                <>
                    <h3 className="font-bold mt-2">Share access:</h3>
                    <input className="w-full p-2 border rounded mt-1" placeholder="Recipient Public Key" onChange={(e) => setShareTo(e.target.value)} />
                    <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded" onClick={share}>Share</button>

                    <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded" onClick={revoke}>Revoke</button>
                </>
            ) : null}
        </div>
    );
}
