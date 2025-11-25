import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Navbar() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="bg-white shadow px-6 py-3 flex justify-between items-center">
            <Link to="/dashboard" className="font-bold text-lg">EduLedger</Link>

            <div className="flex gap-4 items-center">
                <Link to="/docs" className="hover:underline">My Docs</Link>

                {user.role === "issuer" && (
                    <Link to="/upload" className="hover:underline">Upload</Link>
                )}

                <span className="text-sm text-gray-500">{user.email}</span>

                <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
