import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      maxMembers: { type: Number, default: 5 },
      maxTasks: { type: Number, default: 100 },
    },
  },
  {
    timestamps: true,
  },
);

const OrganizationModel = mongoose.model("Organization", organizationSchema);

export default OrganizationModel;