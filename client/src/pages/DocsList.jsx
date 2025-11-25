import { useEffect, useState } from 'react';
import api from '../api/apiClient';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function DocsList() {
    const { user } = useAuth();
    const [ownedDocs, setOwnedDocs] = useState([]);
    const [sharedDocs, setSharedDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    const handleCopy = (textToCopy, type) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopySuccess(`${type} copied to clipboard!`);
            setTimeout(() => setCopySuccess(''), 2000); // Clear message after 2 seconds
        }, () => {
            setCopySuccess(`Failed to copy ${type}.`);
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    useEffect(() => {
        async function fetchDocs() {
            try {
                setLoading(true);
                const ownedRes = await api.get('/user/owned-docs');
                setOwnedDocs(ownedRes.data.docs);

                const sharedRes = await api.get('/user/shared-docs');
                setSharedDocs(sharedRes.data.docs);
            } catch (err) {
                setError('Failed to fetch documents.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchDocs();
    }, []);

    const DocItem = ({ doc }) => (
        <Link to={`/docs/${doc.docId}`} key={doc.docId} className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{doc.metadata.title || 'Untitled Document'}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${doc.revoked ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                    {doc.revoked ? 'REVOKED' : 'VALID'}
                </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">ID: {doc.docId}</p>
        </Link>
    );

    if (loading) return <p className="p-6 text-center text-gray-500">Loading documents...</p>;
    if (error) return <p className="p-6 text-center text-red-600">{error}</p>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            {/* User Info Panel */}
            <div className="p-4 bg-gray-50 border rounded-lg">
                <h2 className="text-lg font-semibold text-gray-700">Your Info</h2>
                <p className="text-sm text-gray-600 mb-3">Use this information to have documents issued or shared with you.</p>

                <div className="space-y-2">
                    {/* User ID */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">User ID:</p>
                        <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-200 px-2 py-1 rounded">{user.id}</code>
                            <button onClick={() => handleCopy(user.id, 'User ID')} className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Copy</button>
                        </div>
                    </div>

                    {/* Public Key */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">Public Key:</p>
                        <button onClick={() => handleCopy(user.blockchainPublicKey, 'Public Key')} className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Copy Key</button>
                    </div>
                    <textarea
                        readOnly
                        className="w-full p-2 text-xs border rounded bg-gray-100 font-mono"
                        rows="4"
                        value={user.blockchainPublicKey}
                    />
                </div>
                {copySuccess && <p className="text-sm text-green-600 mt-2 text-center">{copySuccess}</p>}
            </div>

            {/* Owned Documents */}
            <div>
                <h1 className="text-2xl font-bold mb-4 border-b pb-2">My Documents</h1>
                <div className="space-y-2">
                    {ownedDocs.length > 0 ? (
                        ownedDocs.map((doc) => doc && <DocItem key={doc.docId} doc={doc} />)
                    ) : (
                        <p className="text-gray-500">You do not own or have not issued any documents.</p>
                    )}
                </div>
            </div>

            {/* Shared Documents */}
            <div>
                <h1 className="text-2xl font-bold mb-4 border-b pb-2">Shared With Me</h1>
                <div className="space-y-2">
                    {sharedDocs.length > 0 ? (
                        sharedDocs.map((doc) => doc && <DocItem key={doc.docId} doc={doc} />)
                    ) : (
                        <p className="text-gray-500">No documents have been shared with you.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
