import AuditLog from "../models/AuditLog.js";

export function logAction(actor, action, target = "", details = "") {
  return AuditLog.create({ actor, action, target, details }).catch(() => {});
}
