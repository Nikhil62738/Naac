import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, Save, Trash2, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/http";
import { downloadFile, previewFile } from "../api/download";
import Layout from "../components/Layout";

export default function CriterionForm() {
  const { code } = useParams();
  const [criteria, setCriteria] = useState([]);
  const [values, setValues] = useState({});
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [submission, setSubmission] = useState(null);
  const criterion = useMemo(() => criteria.find((item) => item.code === code), [criteria, code]);

  useEffect(() => {
    api.get("/criteria").then((res) => setCriteria(res.data));
    load();
  }, [code]);

  async function load() {
    const { data } = await api.get(`/submissions/${code}`);
    setSubmission(data.submission);
    setValues(data.submission?.data || {});
    setDocuments(data.documents || []);
  }

  async function save(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.put(`/submissions/${code}`, { data: values });
      setMessage("Saved successfully.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Save failed.");
    }
  }

  async function upload(e) {
    e.preventDefault();
    setMessage("");
    if (!files.length) return;
    try {
      const form = new FormData();
      if (files.length === 1) {
        form.append("file", files[0]);
        await api.post(`/documents/${code}`, form);
      } else {
        [...files].forEach((item) => form.append("files", item));
        await api.post(`/documents/${code}/bulk`, form);
      }
      setFiles([]);
      setMessage(`${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully.`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed.");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/documents/${id}`);
    load();
  }

  if (!criterion) return <Layout><p>Loading...</p></Layout>;
  const groupedFields = (criterion.subCriteria || []).map((sub) => ({
    ...sub,
    fields: criterion.fields.filter((field) => field.subCriterion === sub.code)
  })).filter((sub) => sub.fields.length > 0);

  return (
    <Layout>
      <Link to="/teacher" className="back-link">Back to dashboard</Link>
      <section className="form-page">
        <div>
          <span className="eyebrow">{criterion.marks} marks</span>
          <h2>{criterion.code} - {criterion.title}</h2>
          {submission?.locked && <p className="success">This criterion is locked after verification.</p>}
          {submission?.scoreEstimate > 0 && <p className="muted">Estimated score: {submission.scoreEstimate}/{criterion.marks}</p>}
          <form className="data-form" onSubmit={save}>
            {groupedFields.map((sub) => (
              <React.Fragment key={sub.code}>
                <div className="subcriteria-heading">
                  <strong>{sub.code}</strong>
                  <span>{sub.title}</span>
                </div>
                {sub.fields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}{field.required && " *"}</span>
                    <Field field={field} value={values[field.key] || ""} onChange={(value) => setValues({ ...values, [field.key]: value })} />
                  </label>
                ))}
              </React.Fragment>
            ))}
            {message && <p className={message.includes("success") ? "success" : "error"}>{message}</p>}
            <button><Save size={18} />Save Criterion Data</button>
          </form>
        </div>
        <aside className="panel">
          <h2><Upload size={20} /> Documents</h2>
          <form className="upload-form" onSubmit={upload}>
            <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={(e) => setFiles(e.target.files)} />
            <button><Upload size={16} />Upload</button>
          </form>
          {documents.map((doc) => (
            <div className="doc-row" key={doc._id}>
              <div><strong>{doc.originalName}</strong><small>v{doc.version} | {doc.status} | {doc.scanStatus} | {(doc.size / 1024).toFixed(1)} KB</small></div>
              <button title="Preview" className="download-button" onClick={() => previewFile(`/documents/${doc._id}/preview`)}><Eye size={17} /></button>
              <button title="Download" className="download-button" onClick={() => downloadFile(`/documents/${doc._id}/download`, doc.originalName)}><Download size={17} /></button>
              <button title="Delete" className="icon-button" onClick={() => remove(doc._id)}><Trash2 size={17} /></button>
            </div>
          ))}
        </aside>
      </section>
    </Layout>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === "textarea") return <textarea value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  if (field.type === "select") return <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required}><option value="">Select</option>{field.options.map((item) => <option key={item}>{item}</option>)}</select>;
  if (field.type === "radio") return <div className="radio-row">{field.options.map((item) => <label key={item}><input type="radio" checked={value === item} onChange={() => onChange(item)} />{item}</label>)}</div>;
  return <input type={field.type} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
}
