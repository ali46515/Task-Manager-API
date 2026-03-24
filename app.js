import { config } from "dotenv";
config();

import express from "express";
import cookieParser from "cookie-parser";

import errorHandler from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";

import connectDB from "./config/db.js";

const app = express();

// Built-in global middlewares
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Api rate limiting middleware
app.use("/api", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orgs", organizationRoutes);

app.use("/api/orgs/:orgId/tasks", taskRoutes);
app.use("/api/orgs/:orgId/roles", roleRoutes);
app.use("/api/orgs/:orgId/notifications", notificationRoutes);
app.use("/api/orgs/:orgId/reports", reportRoutes);
app.use("/api/orgs/:orgId/audit", auditRoutes);

// 404(not found) handler
app.all("*", (req, res) => {
  res.status(404).json({
    message: `Cannot find ${req.method} ${req.originalUrl} on this server.`,
  });
});

app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", () => {
    console.log(`Port: http://localhost:${process.env.PORT}`);
  });
};

start();
