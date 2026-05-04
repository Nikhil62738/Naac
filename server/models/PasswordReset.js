import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    otpHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("PasswordReset", passwordResetSchema);
