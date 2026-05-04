import { criteria } from "../criteria.js";

export function computeProgress(submissions, docs = []) {
  return criteria.map((criterion) => {
    const submission = submissions.find((item) => item.criterionCode === criterion.code);
    const filled = submission ? dataValues(submission.data).filter(Boolean).length : 0;
    const uploaded = docs.some((doc) => doc.criterionCode === criterion.code);
    const required = criterion.fields.filter((item) => item.required).length || 1;
    const base = Math.min(80, Math.round((filled / required) * 80));
    const completion = Math.min(100, base + (uploaded ? 20 : 0));
    const deadline = submission?.deadline;
    return {
      code: criterion.code,
      title: criterion.title,
      marks: criterion.marks,
      completion,
      scoreEstimate: Math.round((criterion.marks * completion) / 100),
      status: submission?.status || "Pending",
      locked: Boolean(submission?.locked),
      reviewComment: submission?.reviewComment || "",
      deadline
    };
  });
}

export function estimateScore(criterionCode, data, hasDocs = false) {
  const criterion = criteria.find((item) => item.code === criterionCode);
  if (!criterion) return 0;
  const filled = dataValues(data).filter(Boolean).length;
  const required = criterion.fields.filter((item) => item.required).length || 1;
  const completion = Math.min(100, Math.min(80, Math.round((filled / required) * 80)) + (hasDocs ? 20 : 0));
  return Math.round((criterion.marks * completion) / 100);
}

function dataValues(data) {
  if (!data) return [];
  if (data instanceof Map) return [...data.values()];
  if (typeof data.values === "function") return [...data.values()];
  return Object.values(data);
}
