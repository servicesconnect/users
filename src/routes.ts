import { verifyGatewayRequest } from "@users/config";
import { Application } from "express";

const BUYER_BASE_PATH = "/api/v1/buyer";
const SELLER_BASE_PATH = "/api/v1/seller";

const appRoutes = (app: Application): void => {
  app.use("", () => console.log());
  app.use(BUYER_BASE_PATH, verifyGatewayRequest, () => console.log());
  app.use(SELLER_BASE_PATH, verifyGatewayRequest, () => console.log());
};

export { appRoutes };
