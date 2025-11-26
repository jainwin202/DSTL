import { Routes, Route, Navigate } from "react-router-dom";
import UploadDoc from "./pages/UploadDoc";
import DocsList from "./pages/DocsList";
import ViewDoc from "./pages/ViewDoc";
import Verify from "./pages/Verify";
import VerifyPublic from "./pages/VerifyPublic";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload-doc"
            element={
              <ProtectedRoute roles={["issuer"]}>
                <UploadDoc />
              </ProtectedRoute>
            }
          />

          <Route
            path="/docs"
            element={
              <ProtectedRoute>
                <DocsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/docs/:id"
            element={
              <ProtectedRoute>
                <ViewDoc />
              </ProtectedRoute>
            }
          />

          <Route
            path="/verify"
            element={
              <ProtectedRoute>
                <Verify />
              </ProtectedRoute>
            }
          />

          <Route path="/verify/:id" element={<VerifyPublic />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
