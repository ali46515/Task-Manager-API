import Organization from "../models/organizationModel.js";
import User from "../models/userModel.js";

const getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org)
      return res.status(404).json({ message: "Organization not found" });
    res.status(200).json({ data: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const org = await Organization.create({ name, slug });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { memberships: { organization: org._id, role: "owner" } },
    });

    res.status(201).json({ data: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const allowed = ["name", "plan", "settings"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const org = await Organization.findByIdAndUpdate(req.orgId, updates, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!org)
      return res.status(404).json({ message: "Organization not found" });

    res.status(200).json({ data: org });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    await Organization.findByIdAndDelete(req.orgId);

    await User.updateMany(
      { "memberships.organization": req.orgId },
      { $pull: { memberships: { organization: req.orgId } } },
    );
    res.status(204).json({ status: "success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/orgs/:orgId/invite  [admin+]
const inviteMember = async (req, res) => {
  try {
    const { email, role = "member" } = req.body;

    const invitee = await User.findOne({ email });
    if (!invitee)
      return res.status(404).json({ message: "No user found with that email" });

    const alreadyMember = invitee.memberships.some(
      (m) => m.organization.toString() === req.orgId.toString(),
    );
    if (alreadyMember)
      return res.status(409).json({ message: "User is already a member" });

    if (role === "owner")
      return res.status(400).json({ message: "Cannot invite as owner" });

    await User.findByIdAndUpdate(invitee._id, {
      $push: { memberships: { organization: req.orgId, role } },
    });

    // TODO: send invitation email

    res.status(200).json({ message: `${email} invited as ${role}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMembers = async (req, res) => {
  try {
    const members = await User.find({
      "memberships.organization": req.orgId,
    }).select("name email avatar memberships");

    const result = members.map((u) => {
      const membership = u.memberships.find(
        (m) => m.organization.toString() === req.orgId.toString(),
      );
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: membership?.role,
        joinedAt: membership?.joinedAt,
      };
    });

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const membership = target.memberships.find(
      (m) => m.organization.toString() === req.orgId.toString(),
    );
    if (membership?.role === "owner")
      return res
        .status(403)
        .json({ message: "Cannot remove the organization owner" });

    await User.findByIdAndUpdate(userId, {
      $pull: { memberships: { organization: req.orgId } },
    });

    res.status(200).json({ message: "Member removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  getMembers,
  getOrganization,
  createOrganization,
  deleteOrganization,
  inviteMember,
  removeMember,
  updateOrganization,
};
