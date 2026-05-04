import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../main";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "Computer Engineering", subjects: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/register", { ...form, subjects: form.subjects.split(",").map((item) => item.trim()).filter(Boolean) });
      alert(data.message || "Registration submitted for approval.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Teacher Registration</span>
        <h1>Create account</h1>
        <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input placeholder="Subjects taught, comma separated" value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button>Register</button>
        <p>Already registered? <Link to="/login">Login</Link></p>
      </form>
    </section>
  );
}
