import React, { useEffect, useState } from "react";
import { Bell, Eye, FileArchive, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { downloadFile } from "../api/download";
import Layout from "../components/Layout";
import ProgressBar from "../components/ProgressBar";

export default function HodDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard").then((res) => setTeachers(res.data.teachers || [])).catch((err) => {
      if (err.response?.status !== 401) setError(err.response?.data?.message || "Dashboard failed to load.");
    });
  }, []);

  async function remind(id) {
    const { data } = await api.post("/hod/reminders", { teacherId: id, message: "Please complete pending NAAC uploads before the review deadline." });
    alert(data.email?.to ? `Reminder email sent to ${data.email.to}` : "Reminder saved.");
  }

  const totals = teachers.flatMap((row) => row.progress);
  const verified = totals.filter((item) => item.status === "Verified").length;
  const revisions = totals.filter((item) => item.status === "Needs Revision").length;
  const pending = totals.length - verified - revisions;

  return (
    <Layout>
      <section className="summary-grid">
        <div className="metric"><span>Teachers Registered</span><strong>{teachers.length}</strong></div>
        <div className="metric"><span>Verified / Revision / Pending</span><strong>{verified}/{revisions}/{pending}</strong></div>
        <button className="metric action" onClick={() => downloadFile("/exports/hod/excel", "naac-consolidated-report.xlsx")}><FileSpreadsheet />Download Consolidated Excel</button>
        <button className="metric action" onClick={() => downloadFile("/exports/hod/backup.zip", "naac-document-backup.zip")}><FileArchive />ZIP Backup</button>
      </section>
      {error && <p className="error">{error}</p>}
      <section className="panel">
        <h2>Teacher Submissions</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Teacher</th><th>Progress</th><th>Status by Criteria</th><th>Last Activity</th><th>Actions</th></tr></thead>
            <tbody>
              {teachers.map((row) => {
                const avg = Math.round(row.progress.reduce((sum, item) => sum + item.completion, 0) / row.progress.length);
                return (
                  <tr key={row.teacher._id}>
                    <td><strong>{row.teacher.name}</strong><small>{row.teacher.email}</small></td>
                    <td><ProgressBar value={avg} />{avg}%</td>
                    <td>{row.progress.map((item) => <span className="mini" key={item.code}>{item.code}: {item.status} ({item.scoreEstimate})</span>)}</td>
                    <td>{row.lastActivity ? new Date(row.lastActivity).toLocaleString() : "Not started"}</td>
                    <td className="actions"><Link to={`/hod/teacher/${row.teacher._id}`}><Eye size={17} />View</Link><button onClick={() => remind(row.teacher._id)}><Bell size={17} />Email Reminder</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
