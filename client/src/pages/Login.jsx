import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (e) {
            setError(e?.response?.data?.message || e.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen flex items-center justify-center">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80 space-y-3">
                <h1 className="text-xl font-bold text-center">EduLedger Login</h1>
                <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                </button>
                {error && <p className="text-red-600 text-sm">{error}</p>}
            </form>
        </div>
    );
}
