import React, { useEffect, useState } from "react";
import { FileDown, FileText, FolderOpen, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { downloadFile } from "../api/download";
import Layout from "../components/Layout";
import ProgressBar from "../components/ProgressBar";

export default function TeacherDashboard() {
  const [data, setData] = useState({ progress: [], notifications: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard").then((res) => setData(res.data)).catch((err) => {
      if (err.response?.status !== 401) setError(err.response?.data?.message || "Dashboard failed to load.");
    });
  }, []);

  const overall = data.progress.length ? Math.round(data.progress.reduce((sum, item) => sum + item.completion, 0) / data.progress.length) : 0;

  return (
    <Layout>
      <section className="summary-grid">
        <div className="metric"><span>Overall Progress</span><strong>{overall}%</strong><ProgressBar value={overall} /></div>
        <button className="metric action" onClick={() => downloadFile("/exports/teacher/pdf", "teacher-naac-report.pdf")}><FileText />PDF Report</button>
        <button className="metric action" onClick={() => downloadFile("/exports/teacher/excel", "teacher-naac-report.xlsx")}><FileDown />Excel Report</button>
      </section>
      {error && <p className="error">{error}</p>}
      <section className="content-grid">
        <div>
          <h2>NAAC Criteria</h2>
          <div className="criteria-grid">
            {data.progress.map((item) => (
              <Link className="criterion-card" to={`/teacher/criterion/${item.code}`} key={item.code}>
                <div><FolderOpen /><span className={`status ${item.status.replace(" ", "-").toLowerCase()}`}>{item.status}</span></div>
                <h3>{item.code} - {item.title}</h3>
                <ProgressBar value={item.completion} />
                <strong>{item.completion}% complete | Est. {item.scoreEstimate}/{item.marks}</strong>
                {item.deadline?.dueDate && <small>Due {new Date(item.deadline.dueDate).toLocaleDateString()}</small>}
                {item.locked && <span className="status verified">Locked</span>}
                {item.reviewComment && <p>{item.reviewComment}</p>}
              </Link>
            ))}
          </div>
        </div>
        <aside className="panel">
          <h2><Mail size={20} /> Notifications</h2>
          {data.notifications.length === 0 && <p className="muted">No reminders yet.</p>}
          {data.notifications.map((item) => <div className="notice" key={item._id}>{item.message}<small>{new Date(item.createdAt).toLocaleString()}</small></div>)}
        </aside>
      </section>
    </Layout>
  );
}
