const express = require('express');
const cors = require('cors');
const riskRoutes = require('./routes/risk');
const heatmapRoutes = require('./routes/heatmap');
const sosRoutes = require('./routes/sos');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/risk', riskRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/sos', sosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Guardian AI Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Guardian AI Backend running on port ${PORT}`);
});
