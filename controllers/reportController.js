import Task from "../models/taskModel.js";

const getOverview = async (req, res) => {
  try {
    const orgId = req.orgId;

    const [statusBreakdown, priorityBreakdown, totalTasks, overdueTasks] =
      await Promise.all([
        Task.aggregate([
          { $match: { organization: orgId, isArchived: false } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { organization: orgId, isArchived: false } },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Task.countDocuments({ organization: orgId, isArchived: false }),
        Task.countDocuments({
          organization: orgId,
          isArchived: false,
          dueDate: { $lt: new Date() },
          status: { $nin: ["done", "cancelled"] },
        }),
      ]);

    res.status(200).json({
      data: { totalTasks, overdueTasks, statusBreakdown, priorityBreakdown },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTasksByMember = async (req, res) => {
  try {
    const breakdown = await Task.aggregate([
      { $match: { organization: req.orgId, isArchived: false } },
      {
        $group: {
          _id: "$assignee",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $nin: ["$status", ["done", "cancelled"]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "assignee",
        },
      },
      { $unwind: { path: "$assignee", preserveNullAndEmpty: true } },
      {
        $project: {
          assigneeName: "$assignee.name",
          assigneeEmail: "$assignee.email",
          total: 1,
          done: 1,
          inProgress: 1,
          overdue: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({ data: breakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCompletionTimeline = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeline = await Task.aggregate([
      {
        $match: {
          organization: req.orgId,
          status: "done",
          updatedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ data: timeline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getCompletionTimeline, getTasksByMember, getOverview };
