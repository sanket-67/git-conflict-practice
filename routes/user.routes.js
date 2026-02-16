import express from "express";
import User from "../models/User.js";

const router = express.Router();

// create user
router.post("/", async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json(err);
    next(err);
  }
});

// get users
router.get("/", async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
       res.status(400).json(err);
    next(err);
  }
});

export default router;
