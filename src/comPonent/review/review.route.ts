import { Router } from "express";
import { reviewController } from "./review.controlle.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";



const router = Router()


router.post("/", authMiddleware, Role(["CUSTOMER"]), reviewController.createReview);
router.get("/medicine/:medicineId",reviewController.getReviewsByMedicine);

export const reviewRouter = router;