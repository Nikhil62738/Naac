import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../main";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [weakWarning, setWeakWarning] = useState(false);
  const [reset, setReset] = useState({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  async function submit(e) {
    e.preventDefault();
    if (loginLoading) return;
    setError("");
    setLoginLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.requiresOtp) {
        if (data.weakPassword) setWeakWarning(true);
        setOtp("");
        setOtpMessage(data.message || "OTP sent to your email.");
        setMode("otp-login");
        setResendSeconds(60);
        setLoginLoading(false);
        return;
      }
      login(data);
      if (data.weakPassword) {
        alert("SECURITY NOTICE: Your password is weak. Please change it in your Profile to include uppercase, lowercase, numbers, and special symbols.");
      }
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      setLoginLoading(false);
    }
  }

  async function verifyLogin(e) {
    e.preventDefault();
    if (otpLoading) return;
    setError("");
    setOtpLoading(true);
    try {
      const { data } = await api.post("/auth/login/verify", { email: form.email, otp });
      login(data);
      if (weakWarning || data.weakPassword) {
        alert("SECURITY NOTICE: Your password is weak. Please change it in your Profile to include uppercase, lowercase, numbers, and special symbols.");
      }
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
      setOtpLoading(false);
    }
  }

  async function resendLoginOtp() {
    if (loginLoading || resendSeconds > 0) return;
    setError("");
    setLoginLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      if (data.requiresOtp) {
        setOtp("");
        setOtpMessage(data.message || "OTP sent again to your email.");
        setResendSeconds(60);
        return;
      }
      login(data);
      navigate(data.user.role === "hod" ? "/hod" : "/teacher");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoginLoading(false);
    }
  }

  async function forgot() {
    if (forgotLoading) return;
    setError("");
    if (!form.email) {
      setError("Enter your registered email first.");
      return;
    }
    setForgotLoading(true);
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
      if (data.resetToken) {
        setMode("forgot");
        setResendSeconds(60);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setForgotLoading(false);
    }
  }

  async function resetPassword() {
    if (resetLoading) return;
    setError("");
    if (reset.newPassword !== reset.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    setResetLoading(true);
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
    } finally {
      setResetLoading(false);
    }
  }

  function openForgot() {
    setError("");
    setReset({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
    setResendSeconds(0);
    forgot();
  }

  function backToLogin() {
    setError("");
    setReset({ token: "", email: "", otp: "", newPassword: "", confirmPassword: "", message: "" });
    setOtp("");
    setOtpMessage("");
    setResendSeconds(0);
    setMode("login");
  }

  return (
    <section className="auth-page">
      {mode === "login" ? (
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">NAAC File Management System</span>
        <h1>Sign in</h1>
        {reset.message && <p className="success">{reset.message}</p>}
        <input placeholder="Email" value={form.email} disabled={loginLoading || forgotLoading} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} disabled={loginLoading || forgotLoading} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button disabled={loginLoading || forgotLoading}>{loginLoading && <span className="button-spinner" />} {loginLoading ? "Signing in..." : "Login"}</button>
        <button type="button" className="secondary" disabled={loginLoading || forgotLoading} onClick={openForgot}>{forgotLoading && <span className="button-spinner" />} {forgotLoading ? "Sending OTP..." : "Forgot Password"}</button>
        <p>New teacher? <Link to="/register">Create account</Link></p>
      </form>
      ) : mode === "otp-login" ? (
      <form className="auth-card" onSubmit={verifyLogin}>
        <span className="eyebrow">Security Verification</span>
        <h1>Verify OTP</h1>
        <p>A 6-digit OTP has been sent to <strong>{form.email}</strong></p>
        {otpMessage && <p className="success">{otpMessage}</p>}
        <input placeholder="Enter OTP" value={otp} maxLength={6} disabled={otpLoading} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
        {error && <p className="error">{error}</p>}
        <button disabled={otpLoading}>{otpLoading && <span className="button-spinner" />} {otpLoading ? "Verifying..." : "Verify and Login"}</button>
        <button type="button" className="secondary" disabled={loginLoading || otpLoading || resendSeconds > 0} onClick={resendLoginOtp}>
          {loginLoading && <span className="button-spinner" />}
          {loginLoading ? "Sending OTP..." : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
        </button>
        <button type="button" className="secondary" disabled={otpLoading || loginLoading} onClick={backToLogin}>Back</button>
      </form>
      ) : (
      <form className="auth-card" onSubmit={(e) => e.preventDefault()}>
        <span className="eyebrow">Password Recovery</span>
        <h1>Reset Password</h1>
        {reset.message && <p className="success">{reset.message}</p>}
        {reset.token && (
          <div className="reset-box">
            <small>Resetting password for {reset.email}</small>
            <input placeholder="6-digit OTP from email" value={reset.otp} maxLength={6} disabled={resetLoading} onChange={(e) => setReset({ ...reset, otp: e.target.value.replace(/\D/g, "") })} />
            <input placeholder="New password, minimum 8 characters" type="password" value={reset.newPassword} disabled={resetLoading} onChange={(e) => setReset({ ...reset, newPassword: e.target.value })} />
            <input placeholder="Confirm new password" type="password" value={reset.confirmPassword} disabled={resetLoading} onChange={(e) => setReset({ ...reset, confirmPassword: e.target.value })} />
            {error && <p className="error">{error}</p>}
            <button type="button" className="secondary" disabled={resetLoading} onClick={resetPassword}>{resetLoading && <span className="button-spinner" />} {resetLoading ? "Resetting..." : "Reset Password"}</button>
            <button type="button" className="secondary" disabled={forgotLoading || resetLoading || resendSeconds > 0} onClick={forgot}>
              {forgotLoading && <span className="button-spinner" />}
              {forgotLoading ? "Sending OTP..." : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
            </button>
            <button type="button" className="secondary" disabled={resetLoading} onClick={backToLogin}>Back to Login</button>
          </div>
        )}
      </form>
      )}
    </section>
  );
}
