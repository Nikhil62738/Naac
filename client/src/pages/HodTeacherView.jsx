import React, { useEffect, useState } from "react";
import { Download, Eye, FileText, Lock, Save, Unlock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/http";
import { downloadFile, previewFile } from "../api/download";
import Layout from "../components/Layout";
import ProgressBar from "../components/ProgressBar";

export default function HodTeacherView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [review, setReview] = useState({});

  useEffect(() => {
    api.get("/criteria").then((res) => setCriteria(res.data));
    load();
  }, [id]);

  async function load() {
    const res = await api.get(`/hod/teacher/${id}`);
    setData(res.data);
  }

  async function saveReview(code) {
    await api.patch("/hod/review", {
      teacherId: id,
      criterionCode: code,
      status: review[code]?.status || "Verified",
      reviewComment: review[code]?.reviewComment || "",
      locked: review[code]?.locked
    });
    alert("Teacher notified on dashboard and email.");
    load();
  }

  if (!data) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout>
      <Link className="back-link" to="/hod">Back to HOD dashboard</Link>
      <section className="panel">
        <span className="eyebrow">Read-only teacher view</span>
        <h2>{data.teacher.name}</h2>
        <p className="muted">{data.teacher.email} | {data.teacher.department}</p>
        <button className="secondary" onClick={() => downloadFile(`/exports/hod/teacher/${id}/pdf`, `${data.teacher.name}-verified-naac-report.pdf`)}><FileText size={17} />Download Verified PDF</button>
      </section>
      <div className="review-list">
        {criteria.map((criterion) => {
          const submission = data.submissions.find((item) => item.criterionCode === criterion.code);
          const progress = data.progress.find((item) => item.code === criterion.code);
          const docs = data.documents.filter((item) => item.criterionCode === criterion.code);
          return (
            <section className="panel" key={criterion.code}>
              <div className="criterion-head">
                <div>
                  <h2>{criterion.code} - {criterion.title}</h2>
                  <ProgressBar value={progress?.completion || 0} />
                </div>
                <span className={`status ${(submission?.status || "Pending").replace(" ", "-").toLowerCase()}`}>{submission?.status || "Pending"}</span>
              </div>
              <div className="readonly-grid">
                {criterion.fields.map((field) => <div key={field.key}><span>{field.label}</span><strong>{submission?.data?.[field.key] || "-"}</strong></div>)}
              </div>
              <div className="doc-list">
                {docs.map((doc) => (
                  <React.Fragment key={doc._id}>
                    <button onClick={() => previewFile(`/documents/${doc._id}/preview`)}><Eye size={16} />Preview</button>
                    <button onClick={() => downloadFile(`/documents/${doc._id}/download`, doc.originalName)}><Download size={16} />{doc.originalName}</button>
                  </React.Fragment>
                ))}
              </div>
              {submission?.revisionHistory?.length > 0 && <div className="revision-box">{submission.revisionHistory.map((item, index) => <small key={index}>{item.status}: {item.comment || "No comment"} ({new Date(item.createdAt).toLocaleString()})</small>)}</div>}
              <div className="review-controls">
                <select value={review[criterion.code]?.status || submission?.status || "Verified"} onChange={(e) => setReview({ ...review, [criterion.code]: { ...review[criterion.code], status: e.target.value } })}>
                  <option>Pending</option>
                  <option>Verified</option>
                  <option>Needs Revision</option>
                </select>
                <input placeholder="Review comment" value={review[criterion.code]?.reviewComment || submission?.reviewComment || ""} onChange={(e) => setReview({ ...review, [criterion.code]: { ...review[criterion.code], reviewComment: e.target.value } })} />
                <label className="check-row"><input type="checkbox" checked={review[criterion.code]?.locked ?? submission?.locked ?? false} onChange={(e) => setReview({ ...review, [criterion.code]: { ...review[criterion.code], locked: e.target.checked } })} />{(review[criterion.code]?.locked ?? submission?.locked) ? <Lock size={16} /> : <Unlock size={16} />} Lock</label>
                <button onClick={() => saveReview(criterion.code)}><Save size={17} />Save Review</button>
              </div>
            </section>
          );
        })}
      </div>
    </Layout>
  );
}
