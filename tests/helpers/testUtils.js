import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../../models/userModel.js";
import Organization from "../../models/organizationModel.js";
import Task from "../../models/taskModel.js";

// DB Lifecycle

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME,
    });
  }
};

const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const disconnectTestDB = async () => {
  await mongoose.connection.close();
};

// Factories

const createOrg = async (overrides = {}) => {
  return Organization.create({
    name: "Test Org",
    slug: `test-org-${Date.now()}`,
    plan: "free",
    ...overrides,
  });
};

const createUser = async (org, role = "member", overrides = {}) => {
  return User.create({
    name: "Test User",
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: "password123",
    isEmailVerified: true,
    memberships: [{ organization: org._id, role }],
    ...overrides,
  });
};

const createTask = async (org, createdBy, overrides = {}) => {
  return Task.create({
    organization: org._id,
    createdBy: createdBy._id,
    title: "Test Task",
    status: "todo",
    priority: "medium",
    ...overrides,
  });
};

// Auth Token

const tokenFor = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

// Shared Setup Fixture
// Creates a full org with owner, admin, member, viewer

const setupOrgWithUsers = async () => {
  const org = await createOrg();
  const owner = await createUser(org, "owner", {
    name: "Owner User",
    email: `owner-${Date.now()}@test.com`,
  });
  const admin = await createUser(org, "admin", {
    name: "Admin User",
    email: `admin-${Date.now()}@test.com`,
  });
  const member = await createUser(org, "member", {
    name: "Member User",
    email: `member-${Date.now()}@test.com`,
  });
  const viewer = await createUser(org, "viewer", {
    name: "Viewer User",
    email: `viewer-${Date.now()}@test.com`,
  });

  return {
    org,
    owner,
    ownerToken: tokenFor(owner),
    admin,
    adminToken: tokenFor(admin),
    member,
    memberToken: tokenFor(member),
    viewer,
    viewerToken: tokenFor(viewer),
  };
};

export {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createOrg,
  createUser,
  createTask,
  tokenFor,
  setupOrgWithUsers,
};
