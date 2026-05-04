import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../main";

export default function Login() {
  const [form, setForm] = useState({ email: "teacher@naac.local", password: "teacher12345" });
  const [error, setError] = useState("");
  const [reset, setReset] = useState({ token: "", otp: "", newPassword: "", message: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  async function forgot() {
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email: form.email });
      setReset({ ...reset, token: data.resetToken || "", message: data.email?.to ? `OTP sent to ${data.email.to}` : data.message });
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    }
  }

  async function resetPassword() {
    setError("");
    try {
      const { data } = await api.post("/auth/reset-password", {
        resetToken: reset.token,
        otp: reset.otp,
        newPassword: reset.newPassword
      });
      setReset({ token: "", otp: "", newPassword: "", message: data.message });
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">NAAC File Management System</span>
        <h1>Sign in</h1>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button>Login</button>
        <button type="button" className="secondary" onClick={forgot}>Forgot Password</button>
        {reset.message && <p className="success">{reset.message}</p>}
        {reset.token && (
          <div className="reset-box">
            <input placeholder="Enter OTP from email" value={reset.otp} onChange={(e) => setReset({ ...reset, otp: e.target.value })} />
            <input placeholder="New password" type="password" value={reset.newPassword} onChange={(e) => setReset({ ...reset, newPassword: e.target.value })} />
            <button type="button" className="secondary" onClick={resetPassword}>Reset Password</button>
          </div>
        )}
        <p>New teacher? <Link to="/register">Create account</Link></p>
        <small>Demo HOD: hod@naac.local / hod12345 | IQAC: iqac@naac.local / iqac12345</small>
      </form>
    </section>
  );
}
