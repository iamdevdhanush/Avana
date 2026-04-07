console.log("🚀 Starting Avana backend...");

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 PORT: ${PORT}`);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'https://avana.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("✅ Avana backend running on Render");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

function loadRoutes() {
  try {
    const riskRoutes = require('./routes/risk');
    const heatmapRoutes = require('./routes/heatmap');
    const sosRoutes = require('./routes/sos');
    const chatRoutes = require('./routes/chat');

    app.use('/api/risk', riskRoutes);
    app.use('/api/heatmap', heatmapRoutes);
    app.use('/api/sos', sosRoutes);
    app.use('/api/chat', chatRoutes);
    console.log("✅ Routes loaded successfully (including /api/chat)");
  } catch (routeError) {
    console.error("❌ Error loading routes:", routeError.message);
  }
}

loadRoutes();

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`❤️  http://localhost:${PORT}/health`);
});

process.on("SIGTERM", () => {
  console.log("⚠️ SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

console.log("✅ Avana backend started successfully");
