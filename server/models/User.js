import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["teacher", "hod", "iqac"], default: "teacher" },
    department: { type: String, default: "Computer Engineering" },
    subjects: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: ["Pending", "Approved", "Deactivated"], default: "Approved" },
    loginOtp: { type: String },
    loginOtpExpires: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
