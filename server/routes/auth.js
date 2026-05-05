import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Router } from "express";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import { auth } from "../middleware/auth.js";
import { logAction } from "../utils/audit.js";
import { sendPasswordOtpEmail, sendLoginOtpEmail } from "../utils/mailer.js";

const router = Router();

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  const { name, email, password, department, subjects } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: "teacher", department, subjects, approvalStatus: "Pending", isActive: false });
  await logAction(user._id, "REGISTER", "User", email);
  res.status(201).json({ message: "Registration submitted. HOD approval is required before login." });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (!user.isActive || user.approvalStatus !== "Approved") return res.status(403).json({ message: "Account is pending approval or deactivated" });
  
  const otp = String(crypto.randomInt(100000, 999999));
  user.loginOtp = await bcrypt.hash(otp, 10);
  user.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await user.save();

  try {
    await sendLoginOtpEmail({ to: user.email, name: user.name, otp });
  } catch (error) {
    console.error("Login OTP send failed:", error);
    return res.status(502).json({ message: "Could not send login OTP. Please try again later." });
  }

  res.json({ requiresOtp: true, message: "OTP sent to your email" });
});

router.post("/login/verify", async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  
  if (!user || !user.loginOtp || !user.loginOtpExpires || user.loginOtpExpires < new Date()) {
    return res.status(401).json({ message: "OTP expired or invalid session" });
  }

  const validOtp = await bcrypt.compare(String(otp), user.loginOtp);
  if (!validOtp) return res.status(401).json({ message: "Invalid OTP" });

  user.loginOtp = undefined;
  user.loginOtpExpires = undefined;
  await user.save();

  await logAction(user._id, "LOGIN", "User", email);
  res.json({ token: sign(user), user: clean(user) });
});

router.get("/me", auth, (req, res) => res.json({ user: req.user }));

router.put("/profile", auth, async (req, res) => {
  const update = {
    name: String(req.body.name || "").trim(),
    department: String(req.body.department || "").trim()
  };
  if (!update.name || !update.department) return res.status(400).json({ message: "Name and department are required" });
  if (req.user.role === "teacher") {
    update.subjects = Array.isArray(req.body.subjects)
      ? req.body.subjects.map((item) => String(item).trim()).filter(Boolean)
      : [];
  }
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-passwordHash");
  await logAction(req.user._id, "UPDATE_PROFILE", "User", user.email);
  res.json({ user: clean(user) });
});

router.post("/forgot-password", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(otp, 10);
    const token = crypto.randomBytes(24).toString("hex");
    await PasswordReset.create({ user: user._id, token, otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    let email;
    try {
      email = await sendPasswordOtpEmail({ to: user.email, name: user.name, otp });
    } catch (error) {
      await PasswordReset.updateOne({ token }, { used: true });
      await logAction(user._id, "PASSWORD_RESET_EMAIL_FAILED", "User", error.message);
      return res.status(502).json({ message: "Could not send OTP email. Check SMTP settings and try again." });
    }
    await logAction(user._id, "PASSWORD_RESET_REQUEST", "User", user.email);
    return res.json({ message: "OTP sent to your registered email.", resetToken: token, email: { to: user.email, messageId: email.messageId } });
  }
  res.json({ message: "If the account exists, an OTP will be sent to the registered email." });
});

router.post("/reset-password", async (req, res) => {
  const { resetToken, otp, newPassword } = req.body;
  if (!resetToken || !otp || !newPassword) return res.status(400).json({ message: "Reset token, OTP and new password are required" });
  if (String(newPassword).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
  const reset = await PasswordReset.findOne({ token: resetToken, used: false }).populate("user");
  if (!reset || reset.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired or invalid" });
  const validOtp = await bcrypt.compare(String(otp), reset.otpHash);
  if (!validOtp) return res.status(400).json({ message: "Invalid OTP" });
  reset.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await reset.user.save();
  reset.used = true;
  await reset.save();
  await logAction(reset.user._id, "PASSWORD_RESET_COMPLETE", "User", reset.user.email);
  res.json({ message: "Password reset successfully. Please login with your new password." });
});

router.put("/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" });
  if (String(newPassword).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
  const user = await User.findById(req.user._id);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: "Current password is incorrect" });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  await logAction(user._id, "CHANGE_PASSWORD", "User", user.email);
  res.json({ message: "Password changed successfully." });
});

function clean(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, subjects: user.subjects, isActive: user.isActive, approvalStatus: user.approvalStatus };
}

export default router;
