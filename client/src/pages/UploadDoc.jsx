import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import useAuth from "../hooks/useAuth";

export default function UploadDoc() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [ownerId, setOwnerId] = useState("");
    const [metadata, setMetadata] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        const form = new FormData();
        form.append("file", file);
        form.append("ownerId", ownerId);
        form.append("metadata", metadata);

        const res = await api.post("/issuer/upload", form, {
            headers: { "Content-Type": "multipart/form-data" }
        });

        alert("Uploaded + issued to blockchain!");
        navigate(`/docs/${res.data.docId}`);
    }

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Upload & Issue Document</h1>

            <form className="space-y-3" onSubmit={handleSubmit}>
                <input className="w-full p-2 border rounded" type="file" onChange={(e) => setFile(e.target.files[0])} required />

                <input className="w-full p-2 border rounded" placeholder="Owner User ID" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required />

                <textarea className="w-full p-2 border rounded" placeholder='Metadata JSON e.g. {"title":"B.Tech Degree"}' value={metadata} onChange={(e) => setMetadata(e.target.value)} required />

                <button className="w-full bg-blue-600 text-white py-2 rounded">Upload & Issue</button>
            </form>

            <p className="mt-4 text-sm text-gray-600">
                Logged in as <b>{user.email}</b> ({user.role})
            </p>
        </div>
    );
}
