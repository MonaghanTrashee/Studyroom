import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Home from "./pages/Landing";
import Workspace from "./pages/Workspace";
import Whiteboard from "./pages/Whiteboard";
import Settings from "./pages/Settings";

export default function App() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  return (
    <Router>
      <div className="min-h-screen bg-[#fff0f3] text-[#3e1e68] flex flex-col">
        <nav className="flex justify-between items-center p-4 bg-[#3e1e68] text-white shadow-md">
          <Link to={isAuthenticated ? "/workspace" : "/"} className="text-xl font-bold hover:text-[#ffacac] transition">
            Studyroom
          </Link>
          <div className="flex gap-4 items-center">
            {isAuthenticated && (
              <>
                <Link to="/workspace" className="hover:text-[#ffacac] transition">Workspace</Link>
                <Link to="/whiteboard" className="hover:text-[#ffacac] transition">Whiteboard</Link>
                <Link to="/settings" className="hover:text-[#ffacac] transition">Settings</Link>
              </>
            )}

            {!isAuthenticated ? (
              <button onClick={() => loginWithRedirect()} className="bg-[#e45a92] px-3 py-1 rounded-lg hover:bg-[#ffacac]">
                Log In
              </button>
            ) : null}
          </div>
        </nav>

        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                isLoading
                  ? null
                  : isAuthenticated
                    ? <Navigate to="/workspace" replace />
                    : <Home />
              }
            />
            <Route
              path="/workspace"
              element={isAuthenticated ? <Workspace /> : <Navigate to="/" replace />}
            />
            <Route
              path="/whiteboard"
              element={isAuthenticated ? <Whiteboard /> : <Navigate to="/" replace />}
            />
            <Route
              path="/settings"
              element={isAuthenticated ? <Settings /> : <Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
