import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api, setToken } from "./api/http";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeacherDashboard from "./pages/TeacherDashboard";
import CriterionForm from "./pages/CriterionForm";
import HodDashboard from "./pages/HodDashboard";
import HodTeacherView from "./pages/HodTeacherView";
import AuditLogs from "./pages/AuditLogs";
import AdminTools from "./pages/AdminTools";
import Profile from "./pages/Profile";
import "./styles.css";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [sessions, setSessions] = useState(JSON.parse(localStorage.getItem("sessions") || "{}"));
  const [currentRole, setCurrentRole] = useState(localStorage.getItem("currentRole"));
  const currentSession = currentRole ? sessions[currentRole] : null;
  const tokenState = currentSession?.token || localStorage.getItem("token");
  const user = currentSession?.user || JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => setToken(tokenState), [tokenState]);

  const value = useMemo(() => ({
    user,
    token: tokenState,
    sessions,
    login(payload) {
      const next = { ...sessions, [payload.user.role]: payload };
      localStorage.setItem("sessions", JSON.stringify(next));
      localStorage.setItem("currentRole", payload.user.role);
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      setSessions(next);
      setCurrentRole(payload.user.role);
    },
    switchSession(role) {
      const session = sessions[role];
      if (!session) return;
      localStorage.setItem("currentRole", role);
      localStorage.setItem("token", session.token);
      localStorage.setItem("user", JSON.stringify(session.user));
      setCurrentRole(role);
    },
    updateUser(updatedUser) {
      if (!updatedUser?.role) return;
      const existing = sessions[updatedUser.role];
      const next = {
        ...sessions,
        [updatedUser.role]: {
          token: existing?.token || tokenState,
          user: updatedUser
        }
      };
      localStorage.setItem("sessions", JSON.stringify(next));
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSessions(next);
    },
    logout() {
      if (currentRole && sessions[currentRole]) {
        const next = { ...sessions };
        delete next[currentRole];
        const nextRole = Object.keys(next)[0] || "";
        localStorage.setItem("sessions", JSON.stringify(next));
        if (nextRole) {
          localStorage.setItem("currentRole", nextRole);
          localStorage.setItem("token", next[nextRole].token);
          localStorage.setItem("user", JSON.stringify(next[nextRole].user));
        } else {
          localStorage.removeItem("currentRole");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        setSessions(next);
        setCurrentRole(nextRole);
      } else {
        localStorage.clear();
        setSessions({});
        setCurrentRole("");
      }
    }
  }), [tokenState, user, sessions, currentRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roles = Array.isArray(role) ? role : [role];
  if (role && !roles.includes(user.role)) return <Navigate to={user.role === "teacher" ? "/teacher" : "/hod"} replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher" : "/hod"} replace />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/teacher" element={<Protected role="teacher"><TeacherDashboard /></Protected>} />
          <Route path="/teacher/criterion/:code" element={<Protected role="teacher"><CriterionForm /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/hod" element={<Protected role={["hod", "iqac"]}><HodDashboard /></Protected>} />
          <Route path="/hod/teacher/:id" element={<Protected role={["hod", "iqac"]}><HodTeacherView /></Protected>} />
          <Route path="/hod/logs" element={<Protected role={["hod", "iqac"]}><AuditLogs /></Protected>} />
          <Route path="/hod/tools" element={<Protected role={["hod", "iqac"]}><AdminTools /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
