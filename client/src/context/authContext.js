import { createContext } from "react";

// Keep context creation separate so files that export components only
// don't also export plain values — this avoids the react-refresh ESLint warning.
export const AuthContext = createContext();
