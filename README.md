# Lumina AI

Lumina AI is a full-stack learning platform for students, admins, and super admins. It combines an AI chatbot, quiz practice, video analysis, and role-based dashboards in one web app.

## What this project includes

- Student-facing AI chat experience
- Quiz generation and quiz-taking workflows
- Video analysis and transcription-related features
- Admin and super-admin dashboards
- Supabase-backed authentication and data access
- A lightweight Express proxy server for AI and database requests

## Tech stack

- Frontend: React, Vite, Tailwind CSS, Zustand, React Router
- Backend: Node.js, Express
- Database/Auth: Supabase
- AI: Groq API
- Deployment: Docker and Render-ready configuration

## Project structure

```text
client/          # React frontend
server/          # Express API proxy and route handlers
supabase-schema.sql  # Supabase database schema reference
Dockerfile       # Container build definition
docker-compose.yml  # Local container run config
render.yaml      # Render deployment config
```

## Prerequisites

Before running the app locally, make sure you have:

- Node.js 20 or newer
- npm
- A Supabase project
- A Groq API key
- Optional: Docker

## Step 1: Clone the repository

```bash
git clone https://github.com/surya7989/Lumina-AI-.git
cd Lumina-AI-
```

## Step 2: Create environment variables

Create a file named `.env` in the project root and add the values below.

```env
PORT=5000
CLIENT_URL=http://localhost:5173

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AI_PROXY_URL=http://localhost:5000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GROQ_API_KEY=your-groq-api-key
```

> The frontend uses the `VITE_*` variables, while the server uses the `SUPABASE_*` and `GROQ_API_KEY` values.

## Step 3: Install dependencies

Run the following commands in separate terminals or one after another:

```bash
cd client
npm install
```

```bash
cd ../server
npm install
```

## Step 4: Start the development servers

Start the backend first:

```bash
cd server
npm run dev
```

In a second terminal, start the frontend:

```bash
cd client
npm run dev
```

Open the app in your browser at:

```text
http://localhost:5173
```

## Step 5: Prepare the database

Use the SQL from [supabase-schema.sql](supabase-schema.sql) in your Supabase project so the required tables and columns exist before using the app.

## Step 6: Run with Docker (optional)

If you prefer container-based setup, run:

```bash
docker compose up --build
```

The app will be available at:

```text
http://localhost:5000
```

## Deployment

This repository already includes Docker and Render deployment files:

- [Dockerfile](Dockerfile)
- [docker-compose.yml](docker-compose.yml)
- [render.yaml](render.yaml)

For Render, connect the GitHub repository and use the provided configuration files for deployment.

## Notes

- Keep your `.env` file local and never commit it to GitHub.
- If the AI features do not respond, verify that your Groq API key and Supabase environment variables are correct.
- The frontend and backend communicate through the proxy server defined in [server/server.js](server/server.js).

## License

This project is provided as-is for educational and development purposes.
