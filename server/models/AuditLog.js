import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    target: { type: String, default: "" },
    details: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
