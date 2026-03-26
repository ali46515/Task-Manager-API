import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config());
import mongoose from "mongoose";
import crypto from "crypto";
import Organization from "../models/organizationModel.js";
import User from "../models/userModel.js";
import Task from "../models/taskModel.js";

const MONGO_URI = process.env.MONGO_URI;

const orgs = [
  { name: "Acme Corp", slug: "acme-corp", plan: "pro" },
  { name: "Stark Industries", slug: "stark-industries", plan: "enterprise" },
];

const activeUsers = [
  {
    name: "Alice Owner",
    email: "alice@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "owner",
  },
  {
    name: "Bob Admin",
    email: "bob@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "admin",
  },
  {
    name: "Carol Member",
    email: "carol@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "member",
  },
  {
    name: "Dave Viewer",
    email: "dave@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "viewer",
  },
  {
    name: "Tony Owner",
    email: "tony@stark.com",
    password: "password123",
    orgSlug: "stark-industries",
    role: "owner",
  },
  {
    name: "Pepper Admin",
    email: "pepper@stark.com",
    password: "password123",
    orgSlug: "stark-industries",
    role: "admin",
  },
];

const pendingUsers = [
  {
    name: "Eve Pending",
    email: "eve@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "member",
  },
  {
    name: "Frank Pending",
    email: "frank@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "member",
  },
];

const rejectedUsers = [
  {
    name: "Grace Rejected",
    email: "grace@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "member",
    reason: "Not accepting new members at this time.",
  },
];

const taskTemplates = [
  {
    title: "Set up CI/CD pipeline",
    status: "done",
    priority: "high",
    tags: ["devops"],
  },
  {
    title: "Design onboarding flow",
    status: "in_progress",
    priority: "high",
    tags: ["design", "ux"],
  },
  {
    title: "Write API documentation",
    status: "todo",
    priority: "medium",
    tags: ["docs"],
  },
  {
    title: "Fix login page bug",
    status: "in_review",
    priority: "urgent",
    tags: ["bug"],
  },
  {
    title: "Implement billing integration",
    status: "todo",
    priority: "high",
    tags: ["billing"],
  },
  {
    title: "Add dark mode support",
    status: "todo",
    priority: "low",
    tags: ["ui"],
  },
  {
    title: "Conduct security audit",
    status: "in_progress",
    priority: "urgent",
    tags: ["security"],
  },
  {
    title: "Optimize database queries",
    status: "todo",
    priority: "medium",
    tags: ["performance"],
  },
];

const clearCollections = async () => {
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Task.deleteMany({}),
  ]);
  console.log("🗑️  All collections cleared.");
};

const seed = async () => {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log(`Connected to MongoDB → ${DB_NAME}`);

  await clearCollections();

  if (process.argv.includes("--clear")) {
    await mongoose.disconnect();
    console.log("Database cleared. Exiting.");
    return;
  }

  const createdOrgs = await Organization.insertMany(orgs);
  const orgMap = Object.fromEntries(createdOrgs.map((o) => [o.slug, o]));
  console.log(`Created ${createdOrgs.length} organizations.`);

  const createdActive = [];
  for (const u of activeUsers) {
    const org = orgMap[u.orgSlug];
    const user = await User.create({
      name: u.name,
      email: u.email,
      password: u.password,
      isEmailVerified: true,
      memberships: [
        {
          organization: org._id,
          role: u.role,
          status: "active",
          joinedAt: new Date(),
        },
      ],
    });
    createdActive.push({
      ...user.toObject(),
      orgId: org._id,
      orgSlug: u.orgSlug,
      role: u.role,
    });
  }
  console.log(`👤 Created ${createdActive.length} active users.`);

  for (const u of pendingUsers) {
    const org = orgMap[u.orgSlug];
    await User.create({
      name: u.name,
      email: u.email,
      password: u.password,
      memberships: [{ organization: org._id, role: u.role, status: "pending" }],
    });
  }
  console.log(`Created ${pendingUsers.length} pending users.`);

  for (const u of rejectedUsers) {
    const org = orgMap[u.orgSlug];
    const adminUser = createdActive.find(
      (a) => a.orgSlug === u.orgSlug && a.role === "admin",
    );
    await User.create({
      name: u.name,
      email: u.email,
      password: u.password,
      memberships: [
        {
          organization: org._id,
          role: u.role,
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: adminUser?._id || null,
          rejectionReason: u.reason,
        },
      ],
    });
  }
  console.log(`Created ${rejectedUsers.length} rejected users.`);

  const acmeOrg = orgMap["acme-corp"];
  const invitePlaceholder = new User({
    name: "invited",
    email: "invited-member@acme.com",
    password: crypto.randomBytes(16).toString("hex"),
    memberships: [
      { organization: acmeOrg._id, role: "member", status: "pending" },
    ],
  });
  const rawInviteToken = invitePlaceholder.createInviteToken();
  await invitePlaceholder.save({ validateBeforeSave: false });
  console.log(`Created 1 invite-pending placeholder.`);

  const taskDocs = [];
  for (const org of createdOrgs) {
    const orgMembers = createdActive.filter(
      (u) => u.orgId.toString() === org._id.toString(),
    );
    const owner = orgMembers.find((u) => u.role === "owner");
    const workers = orgMembers.filter((u) =>
      ["member", "admin"].includes(u.role),
    );
    for (const tmpl of taskTemplates) {
      const assignee =
        workers.length > 0
          ? workers[Math.floor(Math.random() * workers.length)]
          : null;
      taskDocs.push({
        organization: org._id,
        createdBy: owner._id,
        assignee: assignee?._id || null,
        dueDate: new Date(
          Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000,
        ),
        ...tmpl,
      });
    }
  }
  await Task.insertMany(taskDocs);
  console.log(`Created ${taskDocs.length} tasks.`);

  console.log("Seed complete!");

  console.log("\nActive users");
  activeUsers.forEach((u) =>
    console.log(
      `  ${u.role.padEnd(8)} │ ${u.email.padEnd(26)} │ ${u.password}`,
    ),
  );

  console.log("\nPending users (need admin approval)");
  pendingUsers.forEach((u) =>
    console.log(`  pending  │ ${u.email.padEnd(26)} │ ${u.password}`),
  );
  console.log("Approve: PATCH /api/orgs/:orgId/members/:userId/approve");

  console.log("\nRejected users");
  rejectedUsers.forEach((u) =>
    console.log(`  rejected │ ${u.email.padEnd(26)} │ ${u.password}`),
  );

  console.log("\nInvite token (Flow B)");
  console.log(`  email    │ invited-member@acme.com`);
  console.log(`  token    │ ${rawInviteToken}`);
  console.log(`  use with │ POST /api/auth/register-via-invite`);

  console.log("\nOrg IDs");
  createdOrgs.forEach((o) => console.log(`  ${o.name.padEnd(22)} │ ${o._id}`));
  console.log(
    "══════════════════════════════════════════════════════════════\n",
  );

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
