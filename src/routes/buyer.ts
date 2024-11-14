import {
  email,
  currentUsername,
  buyerByUsername,
} from "@users/controllers/buyer/get";
import express, { Router } from "express";

const router: Router = express.Router();

const buyerRoutes = (): Router => {
  router.get("/email", email);
  router.get("/username", currentUsername);
  router.get("/:username", buyerByUsername);

  return router;
};

export { buyerRoutes };
