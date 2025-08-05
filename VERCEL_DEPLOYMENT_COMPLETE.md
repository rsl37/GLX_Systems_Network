---
title: "GLX Civic Networking App - Vercel Deployment Guide"
description: ""
lastUpdated: "2025-08-03"
nextReview: "2025-09-03"
contentType: "deployment"
maintainer: "GLX Development Team"
version: "1.0.0"
tags: []
relatedDocs: []
---

# GLX Civic Networking App - Vercel Deployment Guide

## 🚀 Overview
This guide provides step-by-step instructions for deploying the GLX Civic Networking App to Vercel after the architectural overhaul completed in PR #172.

## ✅ What Was Changed
The application has been completely restructured to work with Vercel's serverless architecture:

### Major Changes:
- **WebSocket → Pusher Migration**: Replaced Socket.IO with Pusher for real-time communication
- **Database Migration**: Migrated from SQLite to PostgreSQL for serverless compatibility  
- **Serverless Functions**: Restructured Express server to work as Vercel serverless functions
- **Build Process**: Fixed all TypeScript compilation errors and updated build configuration
- **Test Infrastructure**: Updated test setup to work without Socket.IO dependencies

## 📋 Prerequisites

### 1. Database Setup
You need a PostgreSQL database. Choose one of these options:

#### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel Dashboard
2. Navigate to Storage → Create Database → Postgres
3. Create a new database named `glx_db`
4. Copy the `DATABASE_URL` connection string

#### Option B: External PostgreSQL Provider
- Heroku Postgres
- Railway Postgres
- Supabase
- Amazon RDS
- Any PostgreSQL provider

### 2. Pusher Setup (Required for Real-Time Features)
1. Create a free account at [Pusher](https://pusher.com)
2. Create a new app in the Pusher Dashboard
3. Get your app credentials: App ID, Key, Secret, and Cluster
4. Add these to your Vercel environment variables (see below)

### 3. Environment Variables
Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Database (Required)
DATABASE_URL=postgres://username:password@host:5432/glx_db

# Security (Required)
JWT_SECRET=your-64-character-secure-random-string
NODE_ENV=production

# Real-Time Communication (Required)
PUSHER_APP_ID=your-pusher-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=us2

# CORS Configuration (Required)
CLIENT_ORIGIN=https://your-app-name.vercel.app
FRONTEND_URL=https://your-app-name.vercel.app
TRUSTED_ORIGINS=https://your-app-name.vercel.app

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional: Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_ID=your-google-maps-api-key
```

## 🚀 Deployment Steps

### Step 1: Connect Repository to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`

### Step 2: Configure Build Settings
Vercel should automatically use the settings from `vercel.json`:
- **Build Command**: `cd GLX_App_files && npm install && npm run build`
- **Output Directory**: `GLX_App_files/dist/public`
- **Install Command**: `cd GLX_App_files && npm install`

### Step 3: Set Environment Variables
1. In Vercel Dashboard → Project Settings → Environment Variables
2. Add all the environment variables listed above
3. Make sure to set them for all environments (Production, Preview, Development)

### Step 4: Deploy
1. Click "Deploy" in Vercel
2. Vercel will build and deploy your application
3. The first deployment will also initialize the PostgreSQL database schema

### Step 5: Test Deployment
Once deployed, test these endpoints:
- `https://your-app.vercel.app/` - Frontend application
- `https://your-app.vercel.app/api/health` - API health check
- `https://your-app.vercel.app/api/realtime/health` - Realtime system check

## 📡 How Real-time Features Work Now

### HTTP Polling System
The application now uses HTTP polling instead of WebSockets:

#### Chat Functionality:
- **Sending Messages**: `POST /api/chat/send`
- **Receiving Messages**: `GET /api/chat/messages?since=timestamp`
- **Poll Interval**: 5 seconds (configurable)

#### Notifications:
- **Get Notifications**: `GET /api/notifications?since=timestamp`
- **Poll Interval**: 5 seconds (configurable)

### Benefits:
- ✅ Full Vercel compatibility
- ✅ No connection management complexity
- ✅ Better error handling
- ✅ Works behind corporate firewalls
- ✅ Automatic retry logic

### Trade-offs:
- ⚠️ Slightly higher latency (5-second delays)
- ⚠️ More HTTP requests (but optimized)

## 🛠 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-email/:token` - Email verification

### Chat System (New HTTP-based)
- `GET /api/chat/messages` - Get recent messages
- `POST /api/chat/send` - Send message
- `GET /api/chat/:helpRequestId/messages` - Get messages for specific help request
- `POST /api/chat/join` - Join chat room
- `POST /api/chat/leave` - Leave chat room

### Notifications
- `GET /api/notifications` - Get user notifications

### System
- `GET /api/health` - Application health check
- `GET /api/realtime/health` - Real-time system status

## 🔍 Monitoring & Debugging

### Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on any function to see logs
3. Monitor for errors and performance issues

### Database Monitoring
1. Check PostgreSQL connection in function logs
2. Monitor database performance and connections
3. Use database provider's monitoring tools

### Performance Monitoring
- Vercel automatically provides performance metrics
- Monitor function execution times
- Check for cold start issues

## 🚨 Troubleshooting

### Common Issues:

#### 1. Database Connection Errors
```
Error: Database connection failed
```
**Solution**: 
- Verify `DATABASE_URL` is correctly set
- Check PostgreSQL database is accessible
- Ensure database exists and user has permissions

#### 2. CORS Errors
```
Access to fetch at 'api/...' from origin '...' has been blocked by CORS policy
```
**Solution**:
- Update `CLIENT_ORIGIN` and `TRUSTED_ORIGINS` environment variables
- Ensure URLs match your Vercel deployment URL exactly

#### 3. Function Timeout
```
Function execution timed out
```
**Solution**:
- Optimize database queries
- Add connection pooling (already implemented)
- Check for infinite loops in code

#### 4. Environment Variables Not Found
```
JWT_SECRET environment variable is required
```
**Solution**:
- Verify all environment variables are set in Vercel Dashboard
- Redeploy after setting environment variables

### Debug Endpoints:
- `GET /api/debug/environment` - Check environment configuration
- `GET /api/health` - Overall system health

## 📊 Performance Optimizations

### Database Optimizations:
- ✅ Connection pooling implemented
- ✅ Optimized queries for serverless
- ✅ Automatic connection cleanup

### Frontend Optimizations:
- ✅ Code splitting and lazy loading
- ✅ Compressed assets (gzip)
- ✅ Optimized polling intervals

### Serverless Optimizations:
- ✅ Proper function structure
- ✅ Minimized cold starts
- ✅ Efficient memory usage

## 🔒 Security Features

### Data Protection:
- ✅ SQL injection prevention (Kysely ORM)
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation and sanitization

### Headers Security:
- ✅ HTTPS enforcement
- ✅ XSS protection
- ✅ Content type sniffing prevention
- ✅ Frame options protection

## 📈 Scaling Considerations

### Automatic Scaling:
- Vercel automatically scales serverless functions
- Database connection pooling handles concurrent users
- Frontend serves from global CDN

### Performance Monitoring:
- Monitor function execution times
- Track database query performance
- Watch for memory usage patterns

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ All endpoints respond correctly
- ✅ User registration and login work
- ✅ Chat functionality works with HTTP polling
- ✅ Database operations complete successfully
- ✅ No CORS errors in browser console
- ✅ Performance metrics are acceptable

## 📞 Support

If you encounter issues:
1. Check Vercel function logs first
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check database connectivity
5. Review CORS configuration

The application is now fully compatible with Vercel's serverless architecture and ready for production deployment!
