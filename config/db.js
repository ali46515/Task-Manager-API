import mongoose from "mongoose";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

expand(config());

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let retryCount = 0;

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  const options = {
    dbName: process.env.DB_NAME || "saas_app_dev",
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
  };

  try {
    await mongoose.connect(MONGO_URI, options);
    retryCount = 0;
    console.log(
      `MongoDB connected [${process.env.NODE_ENV || "development"}] -> ${options.dbName}`,
    );
  } catch (err) {
    retryCount++;
    console.error(
      `MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${err.message}`,
    );

    if (retryCount >= MAX_RETRIES) {
      console.error("Max retries reached. Exiting process.");
      process.exit(1);
    }

    console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDB, RETRY_DELAY_MS);
  }
};

mongoose.connection.on("connected", () => {
  console.log("Mongoose connection established.");
});

mongoose.connection.on("error", (err) => {
  console.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected.");

  if (!process.env.GRACEFUL_SHUTDOWN) {
    console.log("Attempting auto-reconnect...");
    setTimeout(connectDB, RETRY_DELAY_MS);
  }
});

export default connectDB;
