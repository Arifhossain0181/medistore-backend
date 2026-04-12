import { Router } from "express";
import { handleSearch } from "./search.controller.js";

const router = Router();

router.get("/", handleSearch);

export default router;
