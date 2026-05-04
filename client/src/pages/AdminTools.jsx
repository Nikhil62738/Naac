import React, { useEffect, useState } from "react";
import { CalendarDays, CheckCircle, Download, Eye, Search } from "lucide-react";
import { api } from "../api/http";
import { downloadFile, previewFile } from "../api/download";
import Layout from "../components/Layout";

export default function AdminTools() {
  const [criteria, setCriteria] = useState([]);
  const [deadlines, setDeadlines] = useState({});
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    api.get("/criteria").then((res) => setCriteria(res.data));
    api.get("/hod/deadlines").then((res) => setDeadlines(Object.fromEntries(res.data.map((item) => [item.criterionCode, item]))));
    api.get("/dashboard").then((res) => setTeachers(res.data.teachers || []));
    search();
  }, []);

  async function saveDeadline(code) {
    const item = deadlines[code];
    if (!item?.dueDate) return alert("Select a due date.");
    const { data } = await api.put(`/hod/deadlines/${code}`, item);
    setDeadlines({ ...deadlines, [code]: data });
  }

  async function search(e) {
    e?.preventDefault();
    const { data } = await api.get("/hod/search", { params: { q } });
    setDocs(data);
  }

  async function approve(id, approvalStatus) {
    await api.patch(`/hod/users/${id}`, { approvalStatus });
    const { data } = await api.get("/dashboard");
    setTeachers(data.teachers || []);
  }

  return (
    <Layout>
      <section className="content-grid">
        <div className="panel">
          <h2><CalendarDays size={20} /> Deadline Management</h2>
          <div className="deadline-grid">
            {criteria.map((item) => (
              <div className="deadline-row" key={item.code}>
                <strong>{item.code}</strong>
                <input type="date" value={(deadlines[item.code]?.dueDate || "").slice(0, 10)} onChange={(e) => setDeadlines({ ...deadlines, [item.code]: { ...deadlines[item.code], dueDate: e.target.value } })} />
                <input placeholder="Note" value={deadlines[item.code]?.note || ""} onChange={(e) => setDeadlines({ ...deadlines, [item.code]: { ...deadlines[item.code], note: e.target.value } })} />
                <button onClick={() => saveDeadline(item.code)}>Save</button>
              </div>
            ))}
          </div>
        </div>
        <aside className="panel">
          <h2><CheckCircle size={20} /> Account Approval</h2>
          {teachers.map((row) => (
            <div className="notice" key={row.teacher._id}>
              <strong>{row.teacher.name}</strong>
              <small>{row.teacher.email} | {row.teacher.approvalStatus}</small>
              <div className="actions">
                <button onClick={() => approve(row.teacher._id, "Approved")}>Approve</button>
                <button onClick={() => approve(row.teacher._id, "Deactivated")}>Deactivate</button>
              </div>
            </div>
          ))}
        </aside>
      </section>
      <section className="panel">
        <h2><Search size={20} /> Advanced Document Search</h2>
        <form className="search-form" onSubmit={search}>
          <input placeholder="Search by file name" value={q} onChange={(e) => setQ(e.target.value)} />
          <button>Search</button>
        </form>
        <div className="table-wrap">
          <table>
            <thead><tr><th>File</th><th>Teacher</th><th>Criterion</th><th>Status</th><th>Scan</th><th>Actions</th></tr></thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.originalName}<small>v{doc.version}</small></td>
                  <td>{doc.teacher?.name}<small>{doc.teacher?.email}</small></td>
                  <td>{doc.criterionCode}</td>
                  <td>{doc.status}</td>
                  <td>{doc.scanStatus}</td>
                  <td className="actions">
                    <button onClick={() => previewFile(`/documents/${doc._id}/preview`)}><Eye size={16} />Preview</button>
                    <button onClick={() => downloadFile(`/documents/${doc._id}/download`, doc.originalName)}><Download size={16} />Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
