import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { AuthContext } from "./authContext";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function login(email, password) {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        // Prefer to use returned user if available, otherwise fetch /auth/me
        if (res.data.user) setUser(res.data.user);
        else {
            const me = await api.get('/auth/me');
            setUser(me.data.user);
        }
    }

    function logout() {
        localStorage.removeItem("token");
        setUser(null);
    }

    useEffect(() => {
        (async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get("/auth/me");
                setUser(res.data.user);
            } catch {
                // token invalid or request failed
                logout();
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
