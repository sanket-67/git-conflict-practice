import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

// create order
router.post("/", async (req, res, next) => {
  try {
    const order = await Order.create(req.body);
    res.json(order);
  } catch (err) {
       res.status(400).json(err);
    next(err);
  }
});

// get orders
router.get("/", async (req, res, next) => {
  try {
    const orders = await Order.find().populate("userId");
    res.json(orders);
  } catch (err) {
       res.status(400).json(err);
    next(err);
  }
});

export default router;
