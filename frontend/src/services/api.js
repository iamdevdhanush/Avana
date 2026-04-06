const API_BASE = 'http://localhost:5000/api';

export const api = {
  async getHeatmap() {
    const response = await fetch(`${API_BASE}/heatmap`);
    return response.json();
  },

  async getRisk(lat, lng, time) {
    const response = await fetch(`${API_BASE}/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, time })
    });
    return response.json();
  },

  async triggerSOS(lat, lng, userId) {
    const response = await fetch(`${API_BASE}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, userId })
    });
    return response.json();
  }
};
