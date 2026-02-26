import { Router } from "express";
import { PaymentsController } from "../controllers/payments.controller";

const router = Router();

router.post("/initiate", PaymentsController.initiate);
router.post("/callback", PaymentsController.callback);
router.get("/:invoiceId/status", PaymentsController.getStatus);

export default router;
