import useAuth from "../hooks/useAuth";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="p-6">
            <div className="flex justify-between">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={logout}>
                    Logout
                </button>
            </div>

            <div className="mt-4 bg-white p-4 rounded shadow">
                <p><b>Name:</b> {user.name}</p>
                <p><b>Email:</b> {user.email}</p>
                <p><b>Role:</b> {user.role}</p>

                <p className="text-xs mt-4">
                    <b>Blockchain Public Key:</b><br />
                    <code className="text-gray-600">{user.blockchainPublicKey}</code>
                </p>
            </div>
        </div>
    );
}
