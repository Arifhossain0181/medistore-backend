import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { reviewController } from "./review.controlle.js";



const router = Router()


router.post("/",authMiddleware,reviewController.createReview);
router.get("/medicine/:medicineId",reviewController.getReviewsByMedicine);

export const reviewRouter = router;