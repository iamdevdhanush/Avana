# Avana - Women's Safety Companion App

A MERN stack application for women's safety with real-time risk assessment, community reporting, and emergency SOS functionality.

## Tech Stack

- **Frontend**: React 18, React Router, Leaflet, Firebase Auth, Supabase
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Maps**: OpenStreetMap, OSRM Routing, Nominatim Geocoding

## Project Structure

```
/avana
├── frontend/           # React frontend
│   ├── src/
│   │   ├── screens/    # App screens (Home, Map, Safety, etc.)
│   │   ├── services/   # API & auth services
│   │   └── components/ # Reusable components
│   └── public/
├── backend/            # Express backend
│   └── src/
│       ├── routes/     # API endpoints
│       └── data/       # Static data (zones)
├── .env                # Local environment variables
└── .env.example        # Environment template
```

## Development

### Prerequisites
- Node.js 18+
- npm

### Local Setup

1. **Backend**:
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
```

2. **Frontend**:
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

3. **Environment Variables**:
Copy `.env.example` to `.env` and fill in your values.

---

## Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: (empty)
   - **Start Command**: `node src/index.js`
4. Add Environment Variables:
   ```
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
5. Deploy

### Frontend (Vercel)

1. Import your GitHub project to [Vercel](https://vercel.com)
2. Configure:
   - **Framework**: Create React App
   - **Root Directory**: `frontend`
3. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   REACT_APP_FIREBASE_API_KEY=...
   REACT_APP_FIREBASE_AUTH_DOMAIN=...
   REACT_APP_FIREBASE_PROJECT_ID=...
   REACT_APP_FIREBASE_STORAGE_BUCKET=...
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
   REACT_APP_FIREBASE_APP_ID=...
   REACT_APP_FIREBASE_MEASUREMENT_ID=...
   REACT_APP_SUPABASE_URL=...
   REACT_APP_SUPABASE_ANON_KEY=...
   ```
4. Deploy

### Important: Update CORS

After deploying frontend, update Render backend environment variable:
```
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/risk` | Get risk assessment for location |
| GET | `/api/heatmap` | Get heatmap data points |
| POST | `/api/sos` | Trigger SOS alert |
| GET | `/health` | Health check |

---

## Features

- **Real-time Location Tracking**: GPS-based safety monitoring
- **Risk Assessment**: AI-powered risk analysis based on time and location
- **Heatmap Visualization**: Crime/frequency heatmap on map
- **Community Reports**: Report and view unsafe areas
- **Safe Routing**: OSRM-based route finding with safety scoring
- **SOS Alerts**: One-tap emergency alert with location sharing
- **Safety Analytics**: Track personal safety events over time

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend port | Yes (Render) |
| `NODE_ENV` | Environment | Yes (production) |
| `FRONTEND_URL` | Frontend URL for CORS | Yes (production) |
| `REACT_APP_API_URL` | Backend API URL | Yes (Vercel) |
| `REACT_APP_FIREBASE_*` | Firebase config | Yes |
| `REACT_APP_SUPABASE_*` | Supabase config | Yes |

---

## License

MIT