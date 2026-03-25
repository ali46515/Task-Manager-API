import crypto from "crypto";
import User from "../models/userModel.js";

const getPendingMembers = async (req, res) => {
  try {
    const pending = await User.find({
      memberships: {
        $elemMatch: { organization: req.orgId, status: "pending" },
      },
    }).select("name email avatar createdAt memberships");

    const result = pending.map((u) => {
      const m = u.getMembership(req.orgId);
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: m.role,
        status: m.status,
        requestedAt: u.createdAt,
      };
    });

    res.status(200).json({ data: result, total: result.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveMember = async (req, res) => {
  try {
    const { role = "member" } = req.body;
    const { userId } = req.params;

    if (role === "owner") {
      return res
        .status(400)
        .json({ message: "Cannot approve a user directly as owner." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const membership = user.getMembership(req.orgId);
    if (!membership)
      return res
        .status(404)
        .json({ message: "User has no membership in this organization." });

    if (membership.status !== "pending") {
      return res
        .status(400)
        .json({ message: `User is already ${membership.status}.` });
    }

    await User.updateOne(
      { _id: userId, "memberships.organization": req.orgId },
      {
        $set: {
          "memberships.$.status": "active",
          "memberships.$.role": role,
          "memberships.$.approvedAt": new Date(),
          "memberships.$.approvedBy": req.user._id,
          "memberships.$.joinedAt": new Date(),
        },
      },
    );

    res.status(200).json({ message: `${user.name} approved as ${role}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectMember = async (req, res) => {
  try {
    const { reason } = req.body;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const membership = user.getMembership(req.orgId);
    if (!membership)
      return res
        .status(404)
        .json({ message: "User has no membership in this organization." });

    if (membership.status !== "pending") {
      return res
        .status(400)
        .json({ message: `User is already ${membership.status}.` });
    }

    await User.updateOne(
      { _id: userId, "memberships.organization": req.orgId },
      {
        $set: {
          "memberships.$.status": "rejected",
          "memberships.$.rejectedAt": new Date(),
          "memberships.$.rejectedBy": req.user._id,
          "memberships.$.rejectionReason": reason || null,
        },
      },
    );

    res
      .status(200)
      .json({ message: `${user.name}'s request has been rejected.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createInvite = async (req, res) => {
  try {
    const { email, role = "member" } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });
    if (role === "owner")
      return res.status(400).json({ message: "Cannot invite as owner." });

    let user = await User.findOne({ email });

    if (user) {
      const existing = user.getMembership(req.orgId);
      if (existing && existing.status !== "rejected") {
        return res.status(409).json({
          message: "User already has a membership in this organization.",
        });
      }
    }

    if (!user) {
      user = new User({
        name: email.split("@")[0],
        email,
        password: crypto.randomBytes(16).toString("hex"),
        memberships: [
          {
            organization: req.orgId,
            role,
            status: "pending",
          },
        ],
      });
    } else {
      const existingIndex = user.memberships.findIndex(
        (m) => m.organization.toString() === req.orgId.toString(),
      );
      if (existingIndex >= 0) {
        user.memberships[existingIndex].role = role;
        user.memberships[existingIndex].status = "pending";
      } else {
        user.memberships.push({
          organization: req.orgId,
          role,
          status: "pending",
        });
      }
    }

    const rawToken = user.createInviteToken();
    await user.save({ validateBeforeSave: false });

    const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/register?token=${rawToken}`;

    res.status(200).json({
      message: `Invite sent to ${email} as ${role}.`,
      inviteLink,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "memberships.organization",
      "name slug plan",
    );

    const memberships = user.memberships.map((m) => ({
      organization: m.organization,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      ...(m.status === "rejected" && { rejectionReason: m.rejectionReason }),
    }));

    res.status(200).json({
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        memberships,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { createInvite, approveMember, rejectMember, getPendingMembers, getMe };
