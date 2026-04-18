# Render Deployment Guide for Skreenit
## Paid Services Configuration

This guide will help you deploy Skreenit on Render's paid services successfully.

### Prerequisites
1. Render account with paid plan access
2. Domain names configured (optional but recommended)
3. Database credentials and API keys ready

### Files Created
- `render.yaml` - Basic configuration for starter plans
- `render-paid.yaml` - Advanced configuration for paid plans
- `pyproject.toml` - Modern Python packaging configuration

### Deployment Steps

#### 1. Connect Your Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository

#### 2. Configure Web Service
Use these settings in Render:

**Basic Settings:**
- Name: `skreenit-backend`
- Environment: `Docker`
- Region: Choose nearest to your users
- Branch: `main`

**Docker Settings:**
- Docker Context: `./`
- Dockerfile Path: `./Dockerfile`

**Advanced Settings:**
- Health Check Path: `/health`
- Auto-Deploy: Enabled

#### 3. Configure Environment Variables
Set these environment variables in Render dashboard:

**Required Variables:**
```bash
# Application
ENVIRONMENT=production
PORT=8080
DEBUG=false

# Database (use Render PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Service
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=onboarding@skreenit.com

# Cloud Storage (Cloudflare R2)
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY=your-r2-access-key
CLOUDFLARE_R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET_NAME=datastorage
R2_ENDPOINT=https://your-storage-domain.com

# CORS Domains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# File Upload Settings
PUBLIC_BASE_URL=https://yourdomain.com
RESUME_PUBLIC_URL=https://storage.yourdomain.com/datastorage/resumes
VIDEO_PUBLIC_URL=https://storage.yourdomain.com/datastorage/videos
PROFILE_IMAGE_PUBLIC_URL=https://storage.yourdomain.com/datastorage/profilepics
```

#### 4. Set Up PostgreSQL Database
1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Choose "Standard" plan for paid service
3. Name: `skreenit-database`
4. Create database

Once created, get the connection string and update your `DATABASE_URL` environment variable.

#### 5. Set Up Redis (Optional, Recommended for Paid Plans)
1. Go to Render Dashboard → "New" → "Redis"
2. Choose "Standard" plan
3. Name: `skreenit-redis`
4. Add `REDIS_URL` to environment variables

#### 6. Configure Custom Domains (Optional)
1. In your web service settings, click "Custom Domains"
2. Add your domains: `api.skreenit.com`, `backend.skreenit.com`
3. Update DNS records as instructed by Render

#### 7. Deploy
1. Push your changes to GitHub
2. Render will automatically build and deploy
3. Monitor the build logs for any issues

### Paid Plan Benefits
- **More Resources**: Higher CPU and memory limits
- **Better Performance**: Faster build times and response times
- **Auto-scaling**: Automatic scaling based on traffic
- **Better Support**: Priority support from Render team
- **Custom Domains**: Free SSL certificates for custom domains

### Monitoring and Maintenance
- Monitor logs in Render dashboard
- Set up alerts for high error rates
- Regular database backups (automatic on paid plans)
- Monitor resource usage and scale as needed

### Troubleshooting Common Issues

#### Build Failures
- Check Dockerfile for syntax errors
- Verify all dependencies in requirements.txt
- Ensure Python version compatibility

#### Runtime Errors
- Check environment variables are correctly set
- Verify database connection string
- Check logs for specific error messages

#### Performance Issues
- Monitor resource usage in Render dashboard
- Consider scaling up your plan if needed
- Optimize database queries and add caching

### Security Best Practices
- Never commit sensitive data to repository
- Use Render's environment variables for secrets
- Enable SSL (automatic on Render)
- Regularly update dependencies
- Monitor for security vulnerabilities

### Support
- Render Documentation: https://render.com/docs
- Render Support: support@render.com
- Your project issues: Check GitHub Issues
