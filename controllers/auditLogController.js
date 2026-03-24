import AuditLog from "../models/auditLogModel.js";

const getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      performedBy,
      targetType,
      page = 1,
      limit = 30,
      from,
      to,
    } = req.query;

    const filter = { organization: req.orgId };
    if (action) filter.action = action;
    if (performedBy) filter.performedBy = performedBy;
    if (targetType) filter.targetType = targetType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findOne({
      _id: req.params.logId,
      organization: req.orgId,
    }).populate("performedBy", "name email");
    if (!log) return res.status(404).json({ message: "Audit log not found" });
    res.status(200).json({ data: log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Log an action (Utility)
const log = async ({
  organization,
  performedBy,
  action,
  targetType,
  targetId,
  changes = {},
  req,
}) => {
  return AuditLog.create({
    organization,
    performedBy,
    action,
    targetType,
    targetId,
    changes,
    ipAddress: req?.ip,
    userAgent: req?.headers?.["user-agent"],
  });
};

export { getAuditLogs, getAuditLogById, log };
