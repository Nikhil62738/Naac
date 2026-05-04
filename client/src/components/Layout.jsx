import React from "react";
import { BookOpenCheck, ClipboardList, FileArchive, FileSpreadsheet, LogOut, Moon, ScrollText, Search, Sun, UserCog, UserRoundCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../main";
import { downloadFile } from "../api/download";

export default function Layout({ children }) {
  const { user, sessions, switchSession, logout } = useAuth();
  const location = useLocation();
  const isAdmin = ["hod", "iqac"].includes(user?.role);
  const nav = isAdmin
    ? [{ to: "/hod", label: "Dashboard", icon: UserRoundCheck }, { to: "/hod/tools", label: "Tools", icon: Search }, { to: "/hod/logs", label: "Audit Logs", icon: ScrollText }, { to: "/profile", label: "Profile", icon: UserCog }]
    : [{ to: "/teacher", label: "My Dashboard", icon: ClipboardList }, { to: "/profile", label: "Profile", icon: UserCog }];
  const dark = localStorage.getItem("theme") === "dark";

  function toggleTheme() {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    document.body.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }

  React.useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BookOpenCheck size={28} />
          <div>
            <strong>NAAC Portal</strong>
            <span>Department Files</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return <Link className={location.pathname === item.to ? "active" : ""} to={item.to} key={item.to}><Icon size={18} />{item.label}</Link>;
          })}
          <button className="nav-button" onClick={() => downloadFile(`/exports/${isAdmin ? "hod/excel" : "teacher/excel"}`, isAdmin ? "naac-consolidated-report.xlsx" : "teacher-naac-report.xlsx")}><FileSpreadsheet size={18} />Excel Export</button>
          {isAdmin && <button className="nav-button" onClick={() => downloadFile("/exports/hod/backup.zip", "naac-document-backup.zip")}><FileArchive size={18} />ZIP Backup</button>}
          <button className="nav-button" onClick={toggleTheme}>{dark ? <Sun size={18} /> : <Moon size={18} />} Theme</button>
        </nav>
        {Object.keys(sessions || {}).length > 1 && (
          <div className="session-switcher">
            <span>Active logins</span>
            {Object.values(sessions).map((session) => (
              <button className={session.user.role === user?.role ? "active-session" : ""} key={session.user.role} onClick={() => switchSession(session.user.role)}>
                {session.user.role.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <button className="ghost logout" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">{isAdmin ? user?.role.toUpperCase() : "Teacher"}</span>
            <h1>{user?.name}</h1>
          </div>
          <span className="pill">{user?.department}</span>
        </header>
        {children}
      </main>
    </div>
  );
}
