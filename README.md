# OpenTerm - Financial Terminal

Bloomberg-style financial terminal with real-time market data, charts, crypto, forex, and news.

## Features

- 📈 **Real-time Market Data** - S&P 500, Dow Jones, NASDAQ, and more
- 📊 **Interactive Charts** - Canvas-based price charts with tooltips
- 💰 **Cryptocurrency** - Live crypto prices from CoinGecko (no API key needed!)
- 📰 **News Feed** - Latest financial news
- 🌍 **Forex** - Currency exchange rates
- 📉 **Macro Dashboard** - Economic indicators (Fed rates, unemployment, CPI)
- 📅 **Earnings Calendar** - Upcoming earnings reports
- 🔍 **Symbol Search** - Find any stock/ETF
- ⭐ **Watchlist** - Track your favorite symbols

## Live Demo

🚀 **[Coming soon - deploying to Railway]**

## Quick Start

```bash
# Clone
git clone https://github.com/mhamata/openterm.git
cd openterm

# Backend
cd backend
pip3 install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Access at http://localhost:8000
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for deployment options (Railway, Render, Fly.io, etc.)

## API Keys (Optional)

Add to `.env` file for full functionality:

```bash
ALPHA_VANTAGE_KEY=your_key
FINNHUB_KEY=your_key
FRED_KEY=your_key
NEWS_API_KEY=your_key
FMP_KEY=your_key
```

**Crypto works immediately without any API keys!**

## Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite
- **Charts:** HTML Canvas
- **Styling:** Inline styles (zero dependencies)

## License

MIT

---

Built by Mike • Powered by OpenClaw
