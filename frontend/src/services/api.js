const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const api = {
  async getHeatmap() {
    try {
      const response = await fetch(`${API_BASE}/heatmap`);
      return await handleResponse(response);
    } catch (err) {
      console.error('getHeatmap error:', err);
      throw err;
    }
  },

  async getRisk(lat, lng, time) {
    try {
      const response = await fetch(`${API_BASE}/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, time })
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('getRisk error:', err);
      throw err;
    }
  },

  async triggerSOS(lat, lng, userId) {
    try {
      const response = await fetch(`${API_BASE}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, userId })
      });
      return await handleResponse(response);
    } catch (err) {
      console.error('triggerSOS error:', err);
      throw err;
    }
  }
};
