import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config);

const testVariables = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = process.env.MONGO_URI;
  process.env.DB_NAME = "saas_test";
  process.env.JWT_SECRET =
    "b07036727d783a9f6bf0f6dfad530fd1428e5b3bf6fba4cf6285ac9f8778319baab7886c88e4dcf9faf0b952e9de217264d7ed1019166ae7661e250d0af381b2";
  process.env.JWT_EXPIRES_IN = "1d";
  process.env.NODE_ENV = "test";
  global.__MONGOD__ = null;
};

export default testVariables;
