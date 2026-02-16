import express from "express";
import { connectDB } from "./db/db.js";
import mongoose from "mongoose";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js";
// import { apiDebugger, attachDBDebugger, debugEndpoint } from "./debugger.js";
import { reqTypeCheck ,attachSpy} from "./debugger.js";
const app = express();
const PORT = 3000;

// body parser
app.use(express.json());

// 1. Attach the Spy (REQUIRED)
attachSpy(mongoose);

// 2. Use the Middleware
app.use(reqTypeCheck);


// routes
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", {
    api: req.__debug?.api,
    body: req.__debug?.body,
    message: err.message
  });

  res.status(500).json({
    error: err.message,
    debug: req.__debug
  });
});

// start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
