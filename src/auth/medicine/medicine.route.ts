import { Router } from "express";
import { getAllmedicine, getSingleMedicine, createMedicine, updateMedicine, deleteMedicine } from "./mdecine.conrtoller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { Role } from "../middleware/role.middleware.js";


const router = Router()

router.get("/", getAllmedicine)
router.get("/:id", getSingleMedicine)

//seller 
router.post("/",authMiddleware,Role(["SELLER"]), createMedicine)
router.patch("/:id",authMiddleware,Role(["SELLER"]), updateMedicine)
router.delete("/:id",authMiddleware,Role(["SELLER"]), deleteMedicine)

export const  medicineRouter = router;