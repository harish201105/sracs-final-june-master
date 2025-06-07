#!/bin/bash

echo "🔧 Installing dependencies..."

# Install backend and frontend dependencies
cd backend && npm install
cd ../frontend && npm install

echo "🚀 Starting backend..."
# Run backend on port 3000 in background
cd ../backend && PORT=3000 npm start &

echo "🌐 Starting frontend (Vite)..."
# Run frontend on port 5173
cd ../frontend && npm run dev