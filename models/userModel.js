import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const membershipSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
    },
    joinedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },

    memberships: [membershipSchema],

    inviteToken: { type: String, select: false },
    inviteTokenExpires: { type: Date },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLoginAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getMembership = function (orgId) {
  return (
    this.memberships.find(
      (m) => m.organization.toString() === orgId.toString(),
    ) || null
  );
};

userSchema.methods.getRoleInOrg = function (orgId) {
  const membership = this.memberships.find(
    (m) => m.organization.toString() === orgId.toString(),
  );
  return membership ? membership.role : null;
};

userSchema.methods.getStatusInOrg = function (orgId) {
  return this.getMembership(orgId)?.status || null;
};

userSchema.methods.createInviteToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.inviteToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.inviteTokenExpires = Date.now() + 72 * 60 * 60 * 1000;
  return rawToken;
};

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
