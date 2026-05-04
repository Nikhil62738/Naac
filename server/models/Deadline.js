import mongoose from "mongoose";

const deadlineSchema = new mongoose.Schema(
  {
    department: { type: String, default: "Computer Engineering" },
    criterionCode: { type: String, required: true },
    dueDate: { type: Date, required: true },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

deadlineSchema.index({ department: 1, criterionCode: 1 }, { unique: true });

export default mongoose.model("Deadline", deadlineSchema);
