# Avana AI Backend API

Production-ready FastAPI backend for the Avana women's safety application.
Migrated from the original Node.js/Express backend with 100% feature parity.

## Architecture

```
backend/
├── app/
│   ├── api/routes/      # API endpoint handlers
│   ├── auth/            # Authentication & JWT verification
│   ├── config/          # Environment configuration
│   ├── data/            # Static data (risk zones, heatmap)
│   ├── middleware/      # Error handling middleware
│   ├── models/          # Pydantic request/response schemas
│   ├── services/        # Business logic layer
│   └── utils/           # Security, logging utilities
├── tests/               # pytest test suite
├── scripts/             # Migration verification tool
├── alembic/             # Database migrations (future)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Quick Start

```bash
# 1. Clone and enter backend
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Run the server
python -m app.main
```

Server starts at `http://localhost:5000`.

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | API info | No |
| GET | `/health` | Health check | No |
| GET | `/api/health` | Health check | No |
| POST | `/api/risk` | Risk assessment | No |
| POST | `/api/assess-risk` | Risk assessment (alias) | No |
| GET | `/api/heatmap` | Heatmap data points | No |
| POST | `/api/sos` | SOS emergency alert | No |
| POST | `/api/sos-alert` | SOS alert (alias) | No |
| POST | `/api/chat` | Gemini AI safety assistant | No |
| GET | `/api/chat/test` | Test Gemini configuration | No |
| POST | `/api/analyze-report` | AI report classification | No |
| GET | `/api/reports` | List classified reports | No |

## API Documentation

When `DEBUG=true`, interactive docs are available at:
- Swagger UI: http://localhost:5000/api/docs
- ReDoc: http://localhost:5000/api/redoc

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `ENVIRONMENT` | No | development | Environment name |
| `DEBUG` | No | true | Enable API docs |
| `FRONTEND_URL` | No | http://localhost:3000 | CORS allowed origin |
| `GEMINI_API_KEY` | For chat | - | Google Gemini API key |
| `GEMINI_MODEL` | No | gemini-1.5-flash | Gemini model name |
| `OPENAI_API_KEY` | For reports | - | OpenAI API key |
| `SUPABASE_URL` | For DB | - | Supabase project URL |
| `SUPABASE_ANON_KEY` | For DB | - | Supabase anon key |

## Docker Deployment

```bash
# Build and run
docker-compose up --build -d

# Or build manually
docker build -t avana-backend .
docker run -p 5000:5000 --env-file .env avana-backend
```

## Railway Deployment

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and init
railway login
railway init

# 3. Add environment variables in Railway dashboard
# 4. Deploy
railway up
```

## Render Deployment

```bash
# 1. Push to GitHub
# 2. In Render dashboard: New > Web Service
# 3. Connect repository
# 4. Settings:
#    - Runtime: Python 3
#    - Build Command: pip install -r requirements.txt
#    - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
# 5. Add environment variables in Render dashboard
# 6. Deploy
```

## VPS (Ubuntu) Deployment

```bash
# 1. Install Python and dependencies
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx

# 2. Clone and setup
git clone https://github.com/your-org/avana-backend /opt/avana
cd /opt/avana
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
nano .env  # Fill in your values

# 4. Create systemd service
sudo tee /etc/systemd/system/avana-backend.service << 'EOF'
[Unit]
Description=Avana Backend API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/avana
ExecStart=/opt/avana/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 5000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 5. Configure nginx reverse proxy
sudo tee /etc/nginx/sites-available/avana << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 6. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable avana-backend
sudo systemctl start avana-backend
sudo ln -s /etc/nginx/sites-available/avana /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pip install pytest-cov
pytest --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_risk_service.py -v
```

## Migration Verification

```bash
# Verify feature parity between Express and FastAPI
python scripts/verify_migration.py
```

## Database Schema

The full Supabase schema is in `supabase_schema.sql`. Tables:
- `user_profiles` — User profile data
- `emergency_contacts` — Emergency contacts
- `sos_alerts` — SOS emergency alerts
- `safety_events` — Safety zone events
- `evidence` — User-uploaded evidence
- `community_reports` — Community safety reports
- `community_posts` — Community feed posts
- `post_comments` — Comments on posts
- `reports` — AI-classified incident reports

Row-Level Security (RLS) is enabled on all tables with granular policies.

## Security

- All secrets are environment variables (never hardcoded)
- CSRF protection via CORS whitelist
- Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- Rate limiting (60 requests/minute by default)
- Input sanitization
- JWT verification via Supabase
- Graceful shutdown on SIGTERM
