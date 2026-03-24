import User from "../models/userModel.js";

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "memberships.organization",
      "name slug plan",
    );
    res.status(200).json({ data: user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateMe = async (req, res) => {
  try {
    if (req.body.password) {
      return res
        .status(400)
        .json({ message: "Use /auth/reset-password to change your password" });
    }

    const allowed = ["name", "avatar"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ data: user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteMe = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.status(204).json({ status: "success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMember = user.memberships.some(
      (m) => m.organization.toString() === req.orgId.toString(),
    );
    if (!isMember)
      return res
        .status(404)
        .json({ message: "User not found in this organization" });

    res.status(200).json({ data: user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getMe, getUserById, deleteMe, updateMe };
