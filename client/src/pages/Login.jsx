import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../main";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [otp, setOtp] = useState("");
  const [reset, setReset] = useState({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.requiresOtp) {
        setMode("otp-login");
        return;
      }
      login(data);
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  async function verifyLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login/verify", { email: form.email, otp });
      login(data);
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    }
  }

  async function forgot() {
    setError("");
    if (!form.email) {
      setError("Enter your registered email first.");
      return;
    }
    try {
      const { data } = await api.post("/auth/forgot-password", { email: form.email });
      setReset({
        token: data.resetToken || "",
        email: form.email,
        otp: "",
        newPassword: "",
        confirmPassword: "",
        message: data.email?.to ? `OTP sent to ${data.email.to}` : data.message
      });
      if (data.resetToken) setMode("forgot");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    }
  }

  async function resetPassword() {
    setError("");
    if (reset.newPassword !== reset.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    try {
      const { data } = await api.post("/auth/reset-password", {
        resetToken: reset.token,
        otp: reset.otp,
        newPassword: reset.newPassword
      });
      setReset({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: data.message });
      setForm({ ...form, password: "" });
      setMode("login");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    }
  }

  function openForgot() {
    setError("");
    setReset({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
    forgot();
  }

  function backToLogin() {
    setError("");
    setReset({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
    setMode("login");
  }

  return (
    <section className="auth-page">
      {mode === "login" ? (
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">NAAC File Management System</span>
        <h1>Sign in</h1>
        {reset.message && <p className="success">{reset.message}</p>}
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button>Login</button>
        <button type="button" className="secondary" onClick={openForgot}>Forgot Password</button>
        <p>New teacher? <Link to="/register">Create account</Link></p>
      </form>
      ) : mode === "otp-login" ? (
      <form className="auth-card" onSubmit={verifyLogin}>
        <span className="eyebrow">Security Verification</span>
        <h1>Verify OTP</h1>
        <p>A 6-digit OTP has been sent to <strong>{form.email}</strong></p>
        <input placeholder="Enter OTP" value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
        {error && <p className="error">{error}</p>}
        <button>Verify and Login</button>
        <button type="button" className="secondary" onClick={() => setMode("login")}>Back</button>
      </form>
      ) : (
      <form className="auth-card" onSubmit={(e) => e.preventDefault()}>
        <span className="eyebrow">Password Recovery</span>
        <h1>Reset Password</h1>
        {reset.message && <p className="success">{reset.message}</p>}
        {reset.token && (
          <div className="reset-box">
            <small>Resetting password for {reset.email}</small>
            <input placeholder="6-digit OTP from email" value={reset.otp} maxLength={6} onChange={(e) => setReset({ ...reset, otp: e.target.value.replace(/\D/g, "") })} />
            <input placeholder="New password, minimum 8 characters" type="password" value={reset.newPassword} onChange={(e) => setReset({ ...reset, newPassword: e.target.value })} />
            <input placeholder="Confirm new password" type="password" value={reset.confirmPassword} onChange={(e) => setReset({ ...reset, confirmPassword: e.target.value })} />
            {error && <p className="error">{error}</p>}
            <button type="button" className="secondary" onClick={resetPassword}>Reset Password</button>
            <button type="button" className="secondary" onClick={backToLogin}>Back to Login</button>
          </div>
        )}
      </form>
      )}
    </section>
  );
}
