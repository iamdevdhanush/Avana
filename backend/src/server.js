const express = require('express');
const cors = require('cors');
const riskRoutes = require('./routes/risk');
const heatmapRoutes = require('./routes/heatmap');
const sosRoutes = require('./routes/sos');

const app = express();

const PORT = process.env.PORT || 5001;

console.log("Server starting...");
console.log(`Environment PORT: ${process.env.PORT || 'not set'}`);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Avana backend running 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Guardian AI Backend is running' });
});

app.use('/api/risk', riskRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/sos', sosRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
