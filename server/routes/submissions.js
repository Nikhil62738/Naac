import { Router } from "express";
import fs from "fs";
import ExcelJS from "exceljs";
import Submission from "../models/Submission.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Deadline from "../models/Deadline.js";
import { criteria } from "../criteria.js";
import { auth, requireRole } from "../middleware/auth.js";
import { upload, uploadPath } from "../middleware/upload.js";
import { logAction } from "../utils/audit.js";
import { computeProgress, estimateScore } from "../utils/progress.js";
import { sendReminderEmail, sendVerificationEmail } from "../utils/mailer.js";

const router = Router();
router.use(auth);

router.get("/criteria", (_req, res) => res.json(criteria));

router.get("/dashboard", async (req, res) => {
  if (["hod", "iqac"].includes(req.user.role)) {
    const teachers = await User.find({ role: "teacher" }).select("-passwordHash").lean();
    const submissions = await Submission.find().lean();
    const docs = await Document.find().select("-fileData").lean();
    const deadlines = await Deadline.find({ department: req.user.department }).lean();
    const rows = teachers.map((teacher) => ({
      teacher,
      progress: computeProgress(
        submissions.filter((item) => String(item.teacher) === String(teacher._id)).map((item) => ({
          ...item,
          deadline: deadlines.find((deadline) => deadline.criterionCode === item.criterionCode)
        })),
        docs.filter((item) => String(item.teacher) === String(teacher._id))
      ),
      lastActivity: submissions.filter((item) => String(item.teacher) === String(teacher._id)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.updatedAt
    }));
    return res.json({ teachers: rows });
  }

  const deadlines = await Deadline.find({ department: req.user.department }).lean();
  const submissions = (await Submission.find({ teacher: req.user._id }).lean()).map((item) => ({
    ...item,
    deadline: deadlines.find((deadline) => deadline.criterionCode === item.criterionCode)
  }));
  const docs = await Document.find({ teacher: req.user._id }).select("-fileData");
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(8);
  res.json({ progress: computeProgress(submissions, docs), notifications });
});

router.get("/submissions/:criterionCode", requireRole("teacher"), async (req, res) => {
  const submission = await Submission.findOne({ teacher: req.user._id, criterionCode: req.params.criterionCode });
  const documents = await Document.find({ teacher: req.user._id, criterionCode: req.params.criterionCode }).select("-fileData").sort({ createdAt: -1 });
  res.json({ submission, documents });
});

router.put("/submissions/:criterionCode", requireRole("teacher"), async (req, res) => {
  const allowed = criteria.find((item) => item.code === req.params.criterionCode);
  if (!allowed) return res.status(404).json({ message: "Criterion not found" });
  const existing = await Submission.findOne({ teacher: req.user._id, criterionCode: req.params.criterionCode });
  if (existing?.locked) return res.status(423).json({ message: "This submission is locked after verification." });
  const data = {};
  for (const item of allowed.fields) data[item.key] = String(req.body.data?.[item.key] || "");
  const missing = allowed.fields.filter((item) => item.required && !data[item.key]);
  if (missing.length) return res.status(400).json({ message: `Missing required fields: ${missing.map((item) => item.label).join(", ")}` });

  const hasDocs = await Document.exists({ teacher: req.user._id, criterionCode: req.params.criterionCode });
  const submission = await Submission.findOneAndUpdate(
    { teacher: req.user._id, criterionCode: req.params.criterionCode },
    { data, status: "Uploaded", scoreEstimate: estimateScore(req.params.criterionCode, data, Boolean(hasDocs)) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await logAction(req.user._id, "SAVE_SUBMISSION", req.params.criterionCode);
  res.json(submission);
});

router.post("/documents/:criterionCode", requireRole("teacher"), upload.single("file"), async (req, res) => {
  const previous = await Document.findOne({ teacher: req.user._id, criterionCode: req.params.criterionCode, fieldKey: req.body.fieldKey || "supporting_document", replacedBy: { $exists: false } }).sort({ version: -1 });
  const doc = await Document.create({
    teacher: req.user._id,
    criterionCode: req.params.criterionCode,
    fieldKey: req.body.fieldKey || "supporting_document",
    originalName: req.file.originalname,
    storedName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    fileData: req.file.buffer,
    version: previous ? previous.version + 1 : 1
  });
  if (previous) await Document.findByIdAndUpdate(previous._id, { replacedBy: doc._id });
  await logAction(req.user._id, "UPLOAD_DOCUMENT", req.params.criterionCode, req.file.originalname);
  res.status(201).json(doc);
});

router.post("/documents/:criterionCode/bulk", requireRole("teacher"), upload.array("files", 20), async (req, res) => {
  const docs = await Document.insertMany(req.files.map((file) => ({
    teacher: req.user._id,
    criterionCode: req.params.criterionCode,
    fieldKey: req.body.fieldKey || "supporting_document",
    originalName: file.originalname,
    storedName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileData: file.buffer,
    scanStatus: "Clean"
  })));
  await logAction(req.user._id, "BULK_UPLOAD_DOCUMENT", req.params.criterionCode, `${docs.length} files`);
  res.status(201).json(docs);
});

router.get("/documents/:id/download", async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (!["hod", "iqac"].includes(req.user.role) && String(doc.teacher) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  const docPath = uploadPath(doc.storedName);
  if (!fs.existsSync(docPath)) return res.status(404).json({ message: "File missing on disk" });
  await logAction(req.user._id, "DOWNLOAD_DOCUMENT", doc.criterionCode, doc.originalName);

  if (doc.fileData) {
    res.setHeader("Content-Disposition", `attachment; filename=\"${doc.originalName}\"`);
    res.setHeader("Content-Type", doc.mimeType);
    return res.send(doc.fileData);
  }

  const docPath = uploadPath(doc.storedName);
  if (!fs.existsSync(docPath)) return res.status(404).json({ message: "File missing on disk" });
  res.download(docPath, doc.originalName);
});

router.get("/documents/:id/preview", async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (!["hod", "iqac"].includes(req.user.role) && String(doc.teacher) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  if (!["application/pdf", "image/jpeg", "image/png"].includes(doc.mimeType)) return res.status(415).json({ message: "Preview supports PDF, JPG, and PNG only" });
  
  const docPath = uploadPath(doc.storedName);
  if (!fs.existsSync(docPath)) return res.status(404).json({ message: "File missing on disk" });
  
  await logAction(req.user._id, "PREVIEW_DOCUMENT", doc.criterionCode, doc.originalName);
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `inline; filename=\"${doc.originalName}\"`);
  
  if (doc.fileData) {
    return res.send(doc.fileData);
  }

  const docPath = uploadPath(doc.storedName);
  if (!fs.existsSync(docPath)) return res.status(404).json({ message: "File missing on disk" });
  
  const stream = fs.createReadStream(docPath);
  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

router.delete("/documents/:id", requireRole("teacher"), async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, teacher: req.user._id }).select("+fileData");
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (!doc.fileData) {
    fs.rm(uploadPath(doc.storedName), { force: true }, () => {});
  }
  await doc.deleteOne();
  await logAction(req.user._id, "DELETE_DOCUMENT", doc.criterionCode, doc.originalName);
  res.json({ ok: true });
});

router.get("/hod/teacher/:teacherId", requireRole("hod", "iqac"), async (req, res) => {
  const teacher = await User.findById(req.params.teacherId).select("-passwordHash");
  const submissions = await Submission.find({ teacher: req.params.teacherId });
  const documents = await Document.find({ teacher: req.params.teacherId }).select("-fileData");
  res.json({ teacher, submissions, documents, progress: computeProgress(submissions, documents) });
});

router.patch("/hod/review", requireRole("hod", "iqac"), async (req, res) => {
  const { teacherId, criterionCode, status, reviewComment, locked } = req.body;
  const teacher = await User.findById(teacherId);
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  const submission = await Submission.findOneAndUpdate(
    { teacher: teacherId, criterionCode },
    {
      $set: {
        status,
        reviewComment,
        locked: typeof locked === "boolean" ? locked : status === "Verified",
        verifiedBy: req.user._id,
        verifiedAt: new Date()
      },
      $push: { revisionHistory: { status, comment: reviewComment || "", reviewer: req.user._id } }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const message = `${criterionCode} marked ${status}. ${reviewComment || ""}`;
  const notification = await Notification.create({ recipient: teacherId, sender: req.user._id, message });
  let email = { messageId: "", preview: "" };
  try {
    email = await sendVerificationEmail({
      to: teacher.email,
      teacherName: teacher.name,
      senderName: req.user.name,
      criterionCode,
      status,
      comment: reviewComment || ""
    });
  } catch (error) {
    await logAction(req.user._id, "VERIFICATION_EMAIL_FAILED", "Notification", `${teacher.email}: ${error.message}`);
  }
  await logAction(req.user._id, "REVIEW_SUBMISSION", criterionCode, `${teacher.email}: ${status}`);
  await logAction(req.user._id, "SEND_VERIFICATION_EMAIL", "Notification", `${teacher.email}: ${email.messageId || "demo-json"}`);
  res.json({ submission, notification, email: { ...email, to: teacher.email } });
});

router.post("/hod/reminders", requireRole("hod", "iqac"), async (req, res) => {
  const { teacherId, message } = req.body;
  const teacher = await User.findById(teacherId);
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });
  const reminderMessage = message || "Please complete your pending NAAC submissions.";
  const note = await Notification.create({ recipient: teacherId, sender: req.user._id, message: reminderMessage });
  let email = { messageId: "", preview: "" };
  try {
    email = await sendReminderEmail({
      to: teacher.email,
      teacherName: teacher.name,
      senderName: req.user.name,
      message: reminderMessage
    });
  } catch (error) {
    await logAction(req.user._id, "REMINDER_EMAIL_FAILED", "Notification", `${teacher.email}: ${error.message}`);
  }
  await logAction(req.user._id, "SEND_REMINDER_EMAIL", "Notification", `${teacher.email}: ${email.messageId || "demo-json"}`);
  res.status(201).json({ notification: note, email: { ...email, to: teacher.email } });
});

router.patch("/hod/users/:id", requireRole("hod", "iqac"), async (req, res) => {
  const approvalStatus = req.body.approvalStatus || (req.body.isActive ? "Approved" : "Deactivated");
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: approvalStatus === "Approved", approvalStatus }, { new: true }).select("-passwordHash");
  await logAction(req.user._id, "UPDATE_USER", "User", `${user.email}: ${user.approvalStatus}`);
  res.json(user);
});

router.get("/hod/search", requireRole("hod", "iqac"), async (req, res) => {
  const query = String(req.query.q || "");
  const criterionCode = req.query.criterionCode;
  const status = req.query.status;
  const filter = {};
  if (criterionCode) filter.criterionCode = criterionCode;
  if (status) filter.status = status;
  if (query) filter.originalName = { $regex: query, $options: "i" };
  const docs = await Document.find(filter).select("-fileData").populate("teacher", "name email department").sort({ createdAt: -1 }).limit(100);
  res.json(docs);
});

router.get("/hod/deadlines", requireRole("hod", "iqac"), async (req, res) => {
  res.json(await Deadline.find({ department: req.user.department }).sort({ criterionCode: 1 }));
});

router.put("/hod/deadlines/:criterionCode", requireRole("hod", "iqac"), async (req, res) => {
  const deadline = await Deadline.findOneAndUpdate(
    { department: req.user.department, criterionCode: req.params.criterionCode },
    { dueDate: req.body.dueDate, note: req.body.note || "" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await logAction(req.user._id, "SET_DEADLINE", req.params.criterionCode, String(req.body.dueDate));
  res.json(deadline);
});

router.post("/submissions/:criterionCode/import", requireRole("teacher"), upload.single("file"), async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const sheet = workbook.worksheets[0];
  const data = {};
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const key = String(row.getCell(1).value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const value = String(row.getCell(2).value || "");
    if (key) data[key] = value;
  });
  req.body.data = data;
  const allowed = criteria.find((item) => item.code === req.params.criterionCode);
  for (const item of allowed.fields) data[item.key] = String(data[item.key] || "");
  const submission = await Submission.findOneAndUpdate(
    { teacher: req.user._id, criterionCode: req.params.criterionCode },
    { data, status: "Uploaded", scoreEstimate: estimateScore(req.params.criterionCode, data, false) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await logAction(req.user._id, "IMPORT_EXCEL", req.params.criterionCode, req.file.originalname);
  res.json(submission);
});

export default router;
