import React, { useState } from "react";
import { Save } from "lucide-react";
import { api } from "../api/http";
import Layout from "../components/Layout";
import { useAuth } from "../main";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department: user?.department || "",
    subjects: (user?.subjects || []).join(", ")
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const { data } = await api.put("/auth/profile", {
        name: form.name,
        department: form.department,
        subjects: form.subjects.split(",").map((item) => item.trim()).filter(Boolean)
      });
      updateUser(data.user);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed.");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const { data } = await api.put("/auth/change-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed.");
    }
  }

  return (
    <Layout>
      <section className="panel profile-panel">
        <span className="eyebrow">{user?.role?.toUpperCase()} Profile</span>
        <h2>Update Profile</h2>
        <form className="data-form" onSubmit={submit}>
          <label>
            <span>Full Name *</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            <span>Login Email</span>
            <input value={form.email} disabled />
          </label>
          <label>
            <span>Department *</span>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
          </label>
          {user?.role === "teacher" && (
            <label>
              <span>Subjects Taught</span>
              <input placeholder="DBMS, Web Technology" value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
            </label>
          )}
          <p className="muted">Email is used for login and reminder mail, so it is read-only here.</p>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <button><Save size={18} />Save Profile</button>
        </form>
      </section>
      <section className="panel profile-panel password-panel">
        <span className="eyebrow">Security</span>
        <h2>Change Password</h2>
        <form className="data-form" onSubmit={changePassword}>
          <label>
            <span>Current Password</span>
            <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
          </label>
          <label>
            <span>New Password</span>
            <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
          </label>
          <p className="muted">New password must be at least 8 characters.</p>
          <button><Save size={18} />Change Password</button>
        </form>
      </section>
    </Layout>
  );
}
