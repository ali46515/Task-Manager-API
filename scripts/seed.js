import mongoose from "mongoose";
import { config } from "dotenv";
import Organization from "../models/organizationModel.js";
import User from "../models/userModel.js";
import Task from "../models/taskModel.js";

config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "saas_app_dev";

const orgs = [
  { name: "Acme Corp", slug: "acme-corp", plan: "pro" },
  { name: "Stark Industries", slug: "stark-industries", plan: "enterprise" },
];

const users = [
  {
    name: "Zain Ahmed",
    email: "zain@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "owner",
  },
  {
    name: "Muneeb Ali",
    email: "muneeb@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "admin",
  },
  {
    name: "Hina Tariq",
    email: "hina@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "member",
  },
  {
    name: "Imran Butt",
    email: "imran@acme.com",
    password: "password123",
    orgSlug: "acme-corp",
    role: "viewer",
  },
  {
    name: "Farhan Javed",
    email: "farhan@stark.com",
    password: "password123",
    orgSlug: "stark-industries",
    role: "owner",
  },
  {
    name: "Ayesha Khan",
    email: "ayesha@stark.com",
    password: "password123",
    orgSlug: "stark-industries",
    role: "admin",
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
  console.log("All collections cleared.");
};

const seed = async () => {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log(`Connected to MongoDB -> ${DB_NAME}`);

  await clearCollections();

  if (process.argv.includes("--clear")) {
    await mongoose.disconnect();
    console.log("Database cleared. Exiting.");
    return;
  }

  const createdOrgs = await Organization.insertMany(orgs);
  const orgMap = Object.fromEntries(createdOrgs.map((o) => [o.slug, o]));
  console.log(`Created ${createdOrgs.length} organizations.`);

  const createdUsers = [];
  for (const u of users) {
    const org = orgMap[u.orgSlug];
    const user = await User.create({
      name: u.name,
      email: u.email,
      password: u.password,
      isEmailVerified: true,
      memberships: [{ organization: org._id, role: u.role }],
    });
    createdUsers.push({ ...user.toObject(), orgId: org._id, role: u.role });
  }
  console.log(`Created ${createdUsers.length} users.`);

  const taskDocs = [];
  for (const org of createdOrgs) {
    const orgMembers = createdUsers.filter(
      (u) => u.orgId.toString() === org._id.toString(),
    );
    const owner = orgMembers.find((u) => u.role === "owner");
    const members = orgMembers.filter((u) =>
      ["member", "admin"].includes(u.role),
    );

    for (const tmpl of taskTemplates) {
      const assignee =
        members.length > 0
          ? members[Math.floor(Math.random() * members.length)]
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
  console.log(
    `Created ${taskDocs.length} tasks across ${createdOrgs.length} organizations.`,
  );

  console.log("Seed complete! Dev credentials:");  
  users.forEach((u) => {
    console.log(
      `  ${u.role.padEnd(8)} │ ${u.email.padEnd(22)} │ password: ${u.password}`,
    );
  });

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
