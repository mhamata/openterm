#!/bin/bash
set -e

echo "🚂 Deploying OpenTerm to Railway..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Installing..."
    brew install gh
fi

# Check if logged into GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Login to GitHub:"
    gh auth login
fi

# Initialize git if needed
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - OpenTerm Financial Terminal"
fi

# Create GitHub repo
echo "📤 Creating GitHub repository..."
if ! gh repo view &> /dev/null; then
    gh repo create openterm --public --source=. --push
else
    echo "✅ Repository already exists"
    git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null || echo "Already pushed"
fi

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "🚂 Next steps:"
echo "1. Go to https://railway.app"
echo "2. Click 'Start a New Project'"
echo "3. Select 'Deploy from GitHub repo'"
echo "4. Choose your 'openterm' repo"
echo "5. Add environment variables (optional):"
echo "   - ALPHA_VANTAGE_KEY"
echo "   - FINNHUB_KEY"
echo "   - FRED_KEY"
echo "   - NEWS_API_KEY"
echo "   - FMP_KEY"
echo ""
echo "6. Deploy! You'll get a live URL in ~2 minutes"
echo ""
echo "💡 Railway will auto-deploy on every git push"
