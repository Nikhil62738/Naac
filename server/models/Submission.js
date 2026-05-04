import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    criterionCode: { type: String, required: true },
    data: { type: Map, of: String, default: {} },
    status: { type: String, enum: ["Pending", "Uploaded", "Verified", "Needs Revision"], default: "Pending" },
    locked: { type: Boolean, default: false },
    scoreEstimate: { type: Number, default: 0 },
    reviewComment: { type: String, default: "" },
    revisionHistory: [
      {
        status: String,
        comment: String,
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date
  },
  { timestamps: true }
);

submissionSchema.index({ teacher: 1, criterionCode: 1 }, { unique: true });

export default mongoose.model("Submission", submissionSchema);
