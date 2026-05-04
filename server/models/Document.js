import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    criterionCode: { type: String, required: true },
    fieldKey: { type: String, default: "supporting_document" },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    version: { type: Number, default: 1 },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Uploaded", "Verified", "Needs Revision"], default: "Uploaded" },
    scanStatus: { type: String, enum: ["Pending Scan", "Clean", "Rejected"], default: "Clean" }
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
