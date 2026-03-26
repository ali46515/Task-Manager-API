import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import EmailService from "../services/mailService.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendToken = (user, statusCode, extra = {}) => {
  const token = signToken(user._id);
  user.password = undefined;
  res
    .status(statusCode)
    .json({ status: "success", token, data: { user }, ...extra });
};

const register = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { name, email, password, orgName, orgId } = req.body;

    if (!orgId && !orgName) {
      throw new Error("Provide either orgId (to join) or orgName (to create).");
    }

    const existing = await User.findOne({ email }).session(session);
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: "Email already in use" });
    }

    let newUser;

    if (orgName) {
      const slug =
        orgName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
      const organization = await Organization.create(
        [{ name: orgName, slug }],
        {
          session,
        },
      );

      [newUser] = await User.create(
        [
          {
            name,
            email,
            password,
            memberships: [
              {
                organization: organization._id,
                role: "owner",
                status: "active",
                joinedAt: new Date(),
              },
            ],
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      return sendToken(user[0], 201, res);
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Organization not found." });
    }

    [newUser] = await User.create(
      [
        {
          name,
          email,
          password,
          memberships: [
            {
              organization: organization._id,
              role: "member",
              status: "pending",
            },
          ],
        },
      ],
      { session },
    );

    sendToken(newUser, 201, res, {
      message:
        "Registration successful. Your membership request is pending admin approval.",
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

const registerViaInvite = async (req, res) => {
  try {
    const { name, password, token } = req.body;

    if (!token)
      return res.status(400).json({ message: "Invite token is required." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const invitedUser = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpires: { $gt: Date.now() },
    }).select("+inviteToken");

    if (!invitedUser) {
      return res
        .status(400)
        .json({ message: "Invite token is invalid or has expired." });
    }

    invitedUser.name = name;
    invitedUser.password = password;
    invitedUser.inviteToken = undefined;
    invitedUser.inviteTokenExpires = undefined;

    invitedUser.memberships.forEach((m) => {
      if (m.status === "pending") {
        m.status = "active";
        m.joinedAt = new Date();
      }
    });

    await invitedUser.save();

    sendToken(invitedUser, 200, res, {
      message:
        "Registration successful. You now have access to your organization.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    const memberships = user.memberships.map((m) => ({
      organization: m.organization,
      role: m.role,
      status: m.status,
    }));

    sendToken(user, 200, res, { memberships });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const logout = (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(404).json({ message: "No user with that email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name || "User",
      );
      res.status(200).json({
        message: "Password reset email sent successfully",
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Email sending failed:", emailError);
      res.status(500).json({
        message: "Error sending email. Please try again.",
        emailError,
      });
    }

    // res.status(200).json({ message: "Reset token generated", resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  registerViaInvite,
};
