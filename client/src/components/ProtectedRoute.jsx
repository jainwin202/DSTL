import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "./Loading";

export default function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();

    // while auth state is being determined, show spinner
    if (loading) return <Loading />;

    if (!user) return <Navigate to="/login" replace />;

    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

    return children;
}
