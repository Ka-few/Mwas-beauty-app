import { Router } from "express";
import { SyncController } from "../controllers/sync.controller";

const router = Router();

router.post("/push", SyncController.pushData);
router.get("/pull", SyncController.pullData);

export default router;
