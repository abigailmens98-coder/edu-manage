# Production Deployment Guide

## Database Setup for Production

Your application currently connects to a **workspace database** (hostname: `helium`) which is **NOT accessible** from Cloud Run deployments.

### To deploy this application, you need to:

1. **Set up a Production PostgreSQL Database**
   
   Option A: **Replit Managed PostgreSQL (Recommended)**
   - Go to your Replit workspace
   - Click on the "Database" icon in the left sidebar
   - Enable "Production Database"
   - Replit will automatically provision a managed PostgreSQL database
   - The `DATABASE_URL` will be automatically added to your deployment secrets

   Option B: **External PostgreSQL Provider**
   - Use providers like:
     - Neon (https://neon.tech) - Serverless PostgreSQL
     - Supabase (https://supabase.com) - Free tier available
     - Railway (https://railway.app) - PostgreSQL hosting
     - Render (https://render.com) - Managed PostgreSQL
   
2. **Configure Production Database URL**
   
   Once you have a production database:
   - Copy the database connection URL
   - In your Replit workspace, go to "Secrets" (lock icon in left sidebar)
   - Add or update the `DATABASE_URL` secret with your production database URL
   
   Format: `postgresql://username:password@host:port/database?sslmode=require`

3. **Verify Deployment Configuration**
   
   Your `.replit` file already has:
   ```
   [deployment]
   deploymentTarget = "autoscale"
   ```
   
   This is correct for Cloud Run deployments.

## Current Status

The application has been updated to:
- ✅ Gracefully handle missing DATABASE_URL
- ✅ Use PostgreSQL-backed sessions (when database is available)
- ✅ Fallback to memory sessions if DATABASE_URL is not set
- ✅ Prevent crash loops from database connection errors
- ✅ Added health check endpoint at `/api/health`

## Testing Before Deployment

1. Verify database connection:
   ```bash
   curl http://localhost:5000/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "timestamp": "2025-12-31T..."
   }
   ```

2. Test login functionality
3. Create test students, teachers, and subjects
4. Enter test scores
5. Generate a broadsheet PDF

## Publishing

Once your production database is configured:

1. Click the "Publish" button in Replit
2. Follow the deployment wizard
3. Your app will be live at `your-app-name.replit.app`

## Important Notes

- **Development Database**: Only accessible within your Replit workspace
- **Production Database**: Must be externally accessible for Cloud Run deployments
- **Session Persistence**: Requires PostgreSQL - memory store doesn't work with Autoscale
- **Data Migration**: You'll need to manually migrate data from development to production if needed

## Troubleshooting

**Error: "Cannot resolve hostname 'helium'"**
- This means DATABASE_URL is still pointing to the workspace database
- Update DATABASE_URL to point to your production database

**Sessions not persisting**
- Verify DATABASE_URL is set correctly
- Check logs for "Using PostgreSQL session store" message

**App crash on startup**
- Check that DATABASE_URL is accessible from Cloud Run
- Verify SSL is enabled for production database connections
