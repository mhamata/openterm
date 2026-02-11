# OpenTerm Deployment Guide

## Option 1: Railway (Recommended - Easiest) 🚂

**Free tier, auto-SSL, custom domain support**

### Steps:

1. **Push to GitHub:**
   ```bash
   cd ~/openterm
   git init
   git add .
   git commit -m "Initial commit - OpenTerm"
   gh repo create openterm --public --source=. --push
   ```

2. **Deploy to Railway:**
   - Go to https://railway.app
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `openterm` repo
   - Railway auto-detects Python and builds automatically
   - **Add environment variables** in Railway dashboard:
     - `ALPHA_VANTAGE_KEY`
     - `FINNHUB_KEY`
     - `FRED_KEY`
     - `NEWS_API_KEY`
     - `FMP_KEY`

3. **Get your live URL:**
   - Railway generates a URL like: `https://openterm-production.up.railway.app`
   - Enable custom domain in settings (optional)

**Done!** Your site is live with auto-deploy on every git push.

---

## Option 2: Render (Also Free Tier) 🎨

### Steps:

1. **Push to GitHub** (same as above)

2. **Deploy to Render:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect GitHub and select `openterm` repo
   - Settings:
     - **Build Command:** `cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt`
     - **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables in Render dashboard

3. **Get your live URL:**
   - Render provides: `https://openterm.onrender.com`

**Note:** Free tier sleeps after 15 min of inactivity (cold starts)

---

## Option 3: Fly.io (Full Docker Control) 🪂

### Steps:

1. **Install Flyctl:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   flyctl auth signup
   ```

2. **Deploy:**
   ```bash
   cd ~/openterm
   flyctl launch --name openterm
   flyctl secrets set ALPHA_VANTAGE_KEY=your_key
   flyctl secrets set FINNHUB_KEY=your_key
   # Add other keys...
   flyctl deploy
   ```

3. **Your URL:** `https://openterm.fly.dev`

---

## Option 4: DigitalOcean App Platform ($5/month) 💧

### Steps:

1. **Push to GitHub**
2. **Create App:**
   - Go to https://cloud.digitalocean.com/apps
   - Create App → GitHub repo
   - Choose `openterm` repo
   - **Dockerfile detected automatically**
   - Add environment variables
   - Deploy

**URL:** `https://openterm-xxxxx.ondigitalocean.app`

---

## Option 5: Quick Demo with ngrok (Temporary) 🚀

**Exposes your localhost to the internet instantly:**

```bash
# Install ngrok
brew install ngrok

# Expose port 8000
ngrok http 8000
```

You get a URL like: `https://a1b2c3d4.ngrok.io` (changes every restart)

**Use case:** Quick demos, testing, sharing with friends

---

## Option 6: VPS (Full Control - Advanced) 🖥️

**For DigitalOcean, AWS EC2, Linode, etc.**

### Setup Script:

```bash
# On your VPS (Ubuntu/Debian)
sudo apt update && sudo apt install -y docker.io docker-compose git

# Clone and run
git clone https://github.com/yourusername/openterm.git
cd openterm
docker build -t openterm .
docker run -d -p 80:8000 --env-file .env --name openterm openterm

# Set up nginx + SSL (optional)
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Recommended for You: Railway or Render

Both have:
- ✅ Free tier (Railway is more generous)
- ✅ Auto-deploy from GitHub
- ✅ Zero config (Railway is smarter)
- ✅ Custom domains
- ✅ Auto SSL certificates
- ✅ Environment variable management

**Railway** is faster and easier. **Render** has better docs.

---

## After Deployment

1. **Add API keys** in the platform's dashboard (don't commit to GitHub!)
2. **Test your live site** - Crypto tab works immediately (no keys needed)
3. **Share your URL** - It's live!

---

## Custom Domain (Optional)

All platforms support custom domains:

1. Add your domain in the platform dashboard
2. Point your DNS to the provided CNAME
3. SSL is automatic

Example: `openterm.yourdomain.com`
