import { databaseConnection, cloudinaryConfig } from "@users/config";
import express, { Express } from "express";
import { start } from "@users/server";

const initialize = (): void => {
  cloudinaryConfig.cloudinaryConfig();
  databaseConnection();
  const app: Express = express();
  start(app);
};

initialize();
