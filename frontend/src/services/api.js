import axios from 'axios';

// The browser will query the FastAPI backend running on port 8000.
// We fall back to localhost if the env variable is not present.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard-stats');
  return response.data;
};

export const sendChatMessage = async (message, history = []) => {
  const response = await api.post('/chat', { message, history });
  return response.data;
};

export const predictTireLife = async (compound, age, trackTemp) => {
  const response = await api.post('/predict-tire', {
    compound,
    age: parseInt(age, 10),
    track_temp: parseFloat(trackTemp),
  });
  return response.data;
};

export const recommendPitStop = async (lapNumber, tireAge, compound, position) => {
  const response = await api.post('/recommend-pit', {
    lap_number: parseInt(lapNumber, 10),
    tire_age: parseInt(tireAge, 10),
    compound,
    position: parseInt(position, 10),
  });
  return response.data;
};

export const compareDrivers = async (driver1, driver2) => {
  const response = await api.post('/compare-drivers', { driver1, driver2 });
  return response.data;
};

export const queryFiaRules = async (query) => {
  const response = await api.post('/fia-assistant', { query });
  return response.data;
};

export const queryRaceReports = async (query) => {
  const response = await api.post('/generate-report', { query });
  return response.data;
};

export default {
  getDashboardStats,
  sendChatMessage,
  predictTireLife,
  recommendPitStop,
  compareDrivers,
  queryFiaRules,
  queryRaceReports,
};
