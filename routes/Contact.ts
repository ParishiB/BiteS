import express from "express";
const router = express.Router();
import { createContact, identify } from "../controller/Contact";

router.post("/createContact", createContact);
router.get("/identify", identify);

module.exports = router;
