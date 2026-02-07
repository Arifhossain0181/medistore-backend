import { Router } from "express";
import { getAllmedicine, getSingleMedicine, createMedicine, updateMedicine, deleteMedicine, incrementView } from "./mdecine.conrtoller.js";
import { Role } from "../../auth/middleware/role.middleware.js";


const router = Router()

router.get("/", getAllmedicine)
router.get("/:id", getSingleMedicine)
router.post("/:id/view", incrementView)

//seller 
router.post("/",Role(["SELLER"]), createMedicine)
router.patch("/:id",Role(["SELLER"]), updateMedicine)
router.delete("/:id",Role(["SELLER"]), deleteMedicine)

export const  medicineRouter = router;