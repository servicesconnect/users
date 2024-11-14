import {
  createSellerController as createSeller,
  id,
  random,
  username,
  seller as updateSeller,
  seed,
} from "@users/controllers";
import express, { Router } from "express";

const router: Router = express.Router();

const sellerRoutes = (): Router => {
  router.get("/id/:sellerId", id);
  router.get("/username/:username", username);
  router.get("/random/:size", random);
  router.post("/create", createSeller);
  router.put("/:sellerId", updateSeller);
  router.put("/seed/:count", seed);

  return router;
};

export { sellerRoutes };
