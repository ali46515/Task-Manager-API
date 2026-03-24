import User from "../models/userModel.js";
import { ROLE_HIERARCHY } from "../middlewares/rbacMiddleware.js";

const getOrgRoles = async (req, res) => {
  try {
    const members = await User.find({
      "memberships.organization": req.orgId,
    }).select("name email avatar memberships");

    const result = members.map((u) => {
      const membership = u.memberships.find(
        (m) => m.organization.toString() === req.orgId.toString(),
      );
      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        role: membership?.role,
      };
    });

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!role || !ROLE_HIERARCHY[role]) {
      return res.status(400).json({
        message: `Invalid role. Valid roles: ${Object.keys(ROLE_HIERARCHY).join(", ")}`,
      });
    }

    if (role === "owner") {
      return res.status(403).json({
        message: "Cannot assign owner role. Transfer ownership instead.",
      });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const membership = target.memberships.find(
      (m) => m.organization.toString() === req.orgId.toString(),
    );
    if (!membership)
      return res
        .status(404)
        .json({ message: "User is not a member of this organization" });
    if (membership.role === "owner")
      return res.status(403).json({ message: "Cannot change the owner role" });

    if (
      req.userRole === "admin" &&
      ROLE_HIERARCHY[role] >= ROLE_HIERARCHY["admin"]
    ) {
      return res
        .status(403)
        .json({ message: "Admins cannot assign admin or higher roles" });
    }

    await User.updateOne(
      { _id: userId, "memberships.organization": req.orgId },
      { $set: { "memberships.$.role": role } },
    );

    res.status(200).json({ message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const transferOwnership = async (req, res) => {
  try {
    const { newOwnerId } = req.body;

    if (req.userRole !== "owner") {
      return res
        .status(403)
        .json({ message: "Only the owner can transfer ownership" });
    }

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner)
      return res.status(404).json({ message: "New owner not found" });

    const isMember = newOwner.memberships.some(
      (m) => m.organization.toString() === req.orgId.toString(),
    );
    if (!isMember)
      return res
        .status(400)
        .json({ message: "New owner must be a member of this organization" });

    await User.updateOne(
      { _id: req.user._id, "memberships.organization": req.orgId },
      { $set: { "memberships.$.role": "admin" } },
    );

    await User.updateOne(
      { _id: newOwnerId, "memberships.organization": req.orgId },
      { $set: { "memberships.$.role": "owner" } },
    );

    res.status(200).json({ message: "Ownership transferred successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getOrgRoles, updateMemberRole, transferOwnership };
