import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payments.routes";
import syncRoutes from "./routes/sync.routes";

dotenv.config();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "payments-api" });
});

// Payment routes
app.use("/api/payments", paymentRoutes);
app.use("/api/sync", syncRoutes);

// Callback route (often easier to have at root or specific mpesa path)
app.use("/api/mpesa", paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Payments server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
