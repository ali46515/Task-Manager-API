import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "task.created",
        "task.updated",
        "task.deleted",
        "task.archived",
        "member.invited",
        "member.removed",
        "role.changed",
        "org.updated",
        "ownership.transferred",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["Task", "User", "Organization"],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);

export default AuditLogModel;
