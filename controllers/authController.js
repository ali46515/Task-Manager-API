const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;
  res.status(statusCode).json({ status: "success", token, data: { user } });
};

const register = async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const slug = orgName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const organization = await Organization.create({ name: orgName, slug });

    const user = await User.create({
      name,
      email,
      password,
      memberships: [{ organization: organization._id, role: "owner" }],
    });

    sendToken(user, 201, res);
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

    sendToken(user, 200, res);
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

    res.status(200).json({ message: "Reset token generated", resetToken });
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

export { register, login, logout, forgotPassword, resetPassword };
