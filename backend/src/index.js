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

app.use(cors({
  origin: "*"
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

    app.use('/api/risk', riskRoutes);
    app.use('/api/heatmap', heatmapRoutes);
    app.use('/api/sos', sosRoutes);
    console.log("✅ Routes loaded successfully");
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
