import Task from "../models/taskModel.js";

const getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignee,
      tags,
      search,
      dueBefore,
      dueAfter,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { organization: req.orgId, isArchived: false };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (tags) filter.tags = { $in: tags.split(",") };
    if (search) filter.title = { $regex: search, $options: "i" };
    if (dueBefore || dueAfter) {
      filter.dueDate = {};
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignee", "name avatar email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      data: tasks,
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

const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      organization: req.orgId,
    })
      .populate("assignee", "name avatar email")
      .populate("createdBy", "name email");

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json({ data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignee, dueDate, tags } =
      req.body;

    const task = await Task.create({
      organization: req.orgId,
      createdBy: req.user._id,
      title,
      description,
      status,
      priority,
      assignee,
      dueDate,
      tags,
    });

    res.status(201).json({ data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      organization: req.orgId,
    });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAdminOrAbove = ["owner", "admin"].includes(req.userRole);
    const isInvolved =
      task.createdBy.toString() === req.user._id.toString() ||
      task.assignee?.toString() === req.user._id.toString();

    if (!isAdminOrAbove && !isInvolved) {
      return res.status(403).json({
        message: "You can only edit tasks you created or are assigned to",
      });
    }

    const allowed = [
      "title",
      "description",
      "status",
      "priority",
      "assignee",
      "dueDate",
      "tags",
    ];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) task[f] = req.body[f];
    });
    await task.save();

    res.status(200).json({ data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      organization: req.orgId,
    });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(204).json({ status: "success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const archiveTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, organization: req.orgId },
      { isArchived: true },
      { new: true },
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json({ data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getTask, getTasks, createTask, deleteTask, updateTask, archiveTask };
