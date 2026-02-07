import { Router } from "express";
import { reviewController } from "./review.controlle.js";



const router = Router()


router.post("/",reviewController.createReview);
router.get("/medicine/:medicineId",reviewController.getReviewsByMedicine);

export const reviewRouter = router;