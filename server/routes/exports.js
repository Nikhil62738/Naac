import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Submission from "../models/Submission.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import { criteria } from "../criteria.js";
import { auth, requireRole } from "../middleware/auth.js";
import { computeProgress } from "../utils/progress.js";
import { logAction } from "../utils/audit.js";
import { uploadPath } from "../middleware/upload.js";

const router = Router();
router.use(auth);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const verifiedSignPath = path.resolve(__dirname, "../assets/verified-sign.png");

router.get("/teacher/excel", requireRole("teacher"), async (req, res) => sendTeacherExcel(req, res, req.user._id));
router.get("/teacher/pdf", requireRole("teacher"), async (req, res) => sendTeacherPdf(req, res, req.user._id));
router.get("/hod/teacher/:teacherId/pdf", requireRole("hod", "iqac"), async (req, res) => sendTeacherPdf(req, res, req.params.teacherId));
router.get("/hod/excel", requireRole("hod", "iqac"), sendHodExcel);
router.get("/hod/backup.zip", requireRole("hod", "iqac"), sendBackupZip);

async function sendTeacherExcel(req, res, teacherId) {
  const teacher = await User.findById(teacherId).lean();
  const submissions = await Submission.find({ teacher: teacherId }).populate("verifiedBy", "name email role").lean();
  const docs = await Document.find({ teacher: teacherId }).lean();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NAAC File Management System";

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 16 }, { width: 42 }, { width: 16 }, { width: 18 }];
  summary.getRow(1).values = ["Criterion", "Title", "Completion %", "Status"];
  computeProgress(submissions, docs).forEach((row) => summary.addRow([row.code, row.title, row.completion, row.status]));
  styleHeader(summary);
  applyAlternatingRows(summary, 2, 4);
  summary.views = [{ state: "frozen", ySplit: 1 }];

  for (const criterion of criteria) {
    const sheet = workbook.addWorksheet(criterion.code);
    sheet.columns = [{ width: 34 }, { width: 44 }, { width: 35 }, { width: 18 }];
    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = `${criterion.code} - ${criterion.title} (${criterion.marks} marks)`;
    styleTitle(sheet);
    sheet.getRow(2).values = ["Field Name", "Value", "Supporting Document", "Status"];
    const submission = submissions.find((item) => item.criterionCode === criterion.code);
    const criterionDocs = docs.filter((item) => item.criterionCode === criterion.code);
    for (const sub of criterion.subCriteria || []) {
      const subFields = criterion.fields.filter((field) => field.subCriterion === sub.code);
      if (!subFields.length) continue;
      const sectionRowNumber = sheet.rowCount + 1;
      sheet.addRow([`${sub.code} - ${sub.title}`, "", "", ""]);
      sheet.mergeCells(`A${sectionRowNumber}:D${sectionRowNumber}`);
      styleSubCriteriaRow(sheet, sectionRowNumber);
      subFields.forEach((field) => {
        const fieldDocs = criterionDocs.filter((item) => item.fieldKey === field.key);
        const supportingDocs = (fieldDocs.length ? fieldDocs : criterionDocs).map((item) => item.originalName).join(", ");
        sheet.addRow([field.label, valueFrom(submission, field.key), supportingDocs, submission?.status || "Pending"]);
      });
    }
    sheet.views = [{ state: "frozen", ySplit: 2 }];
    styleHeader(sheet, 2);
    applyAlternatingRows(sheet, 3, 4);
  }

  await logAction(req.user._id, "EXPORT_TEACHER_EXCEL", "Export", String(teacherId));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${teacher.name}-naac-report.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function sendTeacherPdf(req, res, teacherId) {
  const teacher = await User.findById(teacherId).lean();
  const submissions = await Submission.find({ teacher: teacherId }).lean();
  const docs = await Document.find({ teacher: teacherId }).lean();
  const doc = new PDFDocument({ margin: 48, compress: false });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${teacher.name}-naac-report.pdf"`);
  doc.on("error", (error) => {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ message: "PDF export failed" });
  });
  doc.pipe(res);
  doc.fontSize(22).text("NAAC File Management Report", { align: "center" });
  doc.moveDown().fontSize(13).text(`Teacher: ${teacher.name}`);
  doc.text(`Department: ${teacher.department}`);
  doc.text(`Export Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  for (const progress of computeProgress(submissions, docs)) doc.text(`${progress.code}: ${progress.completion}% - ${progress.status}`);
  for (const criterion of criteria) {
    doc.addPage().fontSize(16).text(`${criterion.code} - ${criterion.title} (${criterion.marks} marks)`);
    const submission = submissions.find((item) => item.criterionCode === criterion.code);
    doc.moveDown().fontSize(10);
    drawVerificationBlock(doc, submission);
    doc.moveDown();
    criterion.fields.forEach((field) => doc.text(`${field.label}: ${valueFrom(submission, field.key) || "-"}`));
    doc.moveDown().fontSize(12).text("Uploaded Documents");
    docs.filter((item) => item.criterionCode === criterion.code).forEach((item) => doc.fontSize(10).text(`${item.originalName} - ${new Date(item.createdAt).toLocaleDateString()}`));
  }
  doc.end();
  await logAction(req.user._id, "EXPORT_TEACHER_PDF", "Export", String(teacherId));
}

function drawVerificationBlock(doc, submission) {
  const status = submission?.status || "Pending";
  const x = 48;
  const y = doc.y;
  const width = 500;
  const height = status === "Verified" ? 116 : 58;
  doc.save();
  doc.roundedRect(x, y, width, height, 8).lineWidth(1).strokeColor(status === "Verified" ? "#15803d" : "#9ca3af").stroke();
  doc.rect(x, y, width, 24).fill(status === "Verified" ? "#dcfce7" : "#f3f4f6");
  doc.fillColor(status === "Verified" ? "#166534" : "#374151").fontSize(11).text(`Verification Status: ${status}`, x + 12, y + 7);
  doc.fillColor("black").fontSize(9);
  const verifiedBy = submission?.verifiedBy?.name || "HOD / IQAC";
  doc.text(`Reviewed By: ${verifiedBy}`, x + 12, y + 36);
  doc.text(`Reviewed At: ${submission?.verifiedAt ? new Date(submission.verifiedAt).toLocaleString() : "-"}`, x + 12, y + 51);
  doc.text(`Comment: ${submission?.reviewComment || "-"}`, x + 12, y + 66, { width: 300 });
  if (status === "Verified" && fs.existsSync(verifiedSignPath)) {
    doc.image(verifiedSignPath, x + 350, y + 35, { width: 125 });
    doc.fillColor("#166534").fontSize(8).text("Authorized Signature", x + 350, y + 91, { width: 125, align: "center" });
  }
  doc.restore();
  doc.y = y + height + 14;
  if (status === "Verified") drawVerifiedStamp(doc, submission);
}

function drawVerifiedStamp(doc, submission) {
  doc.save();
  doc.rotate(-18, { origin: [410, 92] });
  doc
    .roundedRect(320, 58, 190, 48, 8)
    .lineWidth(2)
    .strokeColor("#15803d")
    .stroke();
  doc
    .fontSize(24)
    .fillColor("#15803d")
    .text("VERIFIED", 342, 70, { width: 150, align: "center" });
  doc
    .fontSize(7)
    .fillColor("#166534")
    .text(submission.verifiedAt ? new Date(submission.verifiedAt).toLocaleDateString() : "", 342, 98, { width: 150, align: "center" });
  doc.restore();
  doc.fillColor("black").strokeColor("black");
}

async function sendHodExcel(req, res) {
  const teachers = await User.find({ role: "teacher" }).lean();
  const submissions = await Submission.find().populate("teacher", "name email department").lean();
  const docs = await Document.find().populate("teacher", "name email").lean();
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Teacher", width: 24 },
    { header: "Email", width: 30 },
    { header: "Criterion", width: 12 },
    { header: "Completion %", width: 16 },
    { header: "Verification Status", width: 20 }
  ];
  teachers.forEach((teacher) => {
    computeProgress(submissions.filter((item) => String(item.teacher._id) === String(teacher._id)), docs.filter((item) => String(item.teacher._id) === String(teacher._id))).forEach((row) => {
      summary.addRow([teacher.name, teacher.email, row.code, row.completion, row.status]);
    });
  });
  styleHeader(summary);

  for (const criterion of criteria) {
    const sheet = workbook.addWorksheet(criterion.code);
    sheet.columns = [
      { header: "Teacher", width: 24 },
      { header: "Email", width: 30 },
      { header: "Sub-Criterion", width: 34 },
      { header: "Field Name", width: 34 },
      { header: "Value", width: 34 },
      { header: "Supporting Documents", width: 36 },
      ...criterion.fields.map((field) => ({ header: field.label, width: 28 })),
      { header: "Status", width: 18 },
      { header: "Review Comment", width: 32 }
    ];
    submissions.filter((item) => item.criterionCode === criterion.code).forEach((item) => {
      const criterionDocs = docs.filter((doc) => String(doc.teacher._id) === String(item.teacher._id) && doc.criterionCode === criterion.code);
      for (const field of criterion.fields) {
        const sub = criterion.subCriteria?.find((subItem) => subItem.code === field.subCriterion);
        const fieldDocs = criterionDocs.filter((doc) => doc.fieldKey === field.key);
        sheet.addRow([
          item.teacher.name,
          item.teacher.email,
          sub ? `${sub.code} - ${sub.title}` : field.subCriterion,
          field.label,
          valueFrom(item, field.key),
          fieldDocs.map((doc) => doc.originalName).join(", "),
          ...criterion.fields.map((wideField) => (wideField.key === field.key ? valueFrom(item, field.key) : "")),
          item.status,
          item.reviewComment
        ]);
      }
    });
    styleHeader(sheet);
  }

  const index = workbook.addWorksheet("Document Index");
  index.columns = [{ header: "Teacher", width: 24 }, { header: "Criterion", width: 12 }, { header: "File", width: 44 }, { header: "Status", width: 18 }, { header: "Uploaded At", width: 22 }];
  docs.forEach((item) => index.addRow([item.teacher.name, item.criterionCode, item.originalName, item.status, item.createdAt]));
  styleHeader(index);

  await logAction(req.user._id, "EXPORT_HOD_EXCEL", "Export", "All teachers");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=\"naac-consolidated-report.xlsx\"");
  await workbook.xlsx.write(res);
  res.end();
}

async function sendBackupZip(req, res) {
  const docs = await Document.find().populate("teacher", "name email").lean();
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=\"naac-document-backup.zip\"");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ message: "Backup failed" });
  });
  archive.pipe(res);
  for (const doc of docs) {
    const filePath = uploadPath(doc.storedName);
    if (fs.existsSync(filePath)) {
      const teacherName = (doc.teacher?.name || "Unknown Teacher").replace(/[^a-zA-Z0-9._-]/g, "_");
      archive.file(filePath, { name: `${teacherName}/${doc.criterionCode}/v${doc.version}-${doc.originalName}` });
    }
  }
  await logAction(req.user._id, "EXPORT_BACKUP_ZIP", "Export", `${docs.length} files`);
  await archive.finalize();
}

function styleHeader(sheet, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF164E63" } };
  row.alignment = { vertical: "middle" };
}

function styleTitle(sheet) {
  const row = sheet.getRow(1);
  row.height = 24;
  row.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
}

function styleSubCriteriaRow(sheet, rowNumber) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FF164E63" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4F1" } };
  row.alignment = { vertical: "middle" };
}

function applyAlternatingRows(sheet, startRow, columnCount) {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (String(row.getCell(1).value || "").match(/^\d+\.\d+ - /)) continue;
    const fillColor = rowNumber % 2 === 0 ? "FFF0F7F5" : "FFFFFFFF";
    for (let col = 1; col <= columnCount; col += 1) {
      row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
      row.getCell(col).border = {
        top: { style: "thin", color: { argb: "FFE2E8E4" } },
        left: { style: "thin", color: { argb: "FFE2E8E4" } },
        bottom: { style: "thin", color: { argb: "FFE2E8E4" } },
        right: { style: "thin", color: { argb: "FFE2E8E4" } }
      };
      row.getCell(col).alignment = { vertical: "top", wrapText: true };
    }
  }
}

function valueFrom(submission, key) {
  if (!submission?.data) return "";
  if (submission.data instanceof Map) return submission.data.get(key) || "";
  return submission.data[key] || "";
}

export default router;
