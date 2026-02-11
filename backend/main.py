import os, time, asyncio, json
from datetime import datetime, timedelta
from typing import Optional
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "demo")
FINNHUB_KEY = os.getenv("FINNHUB_KEY", "")
FRED_KEY = os.getenv("FRED_KEY", "")
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
FMP_KEY = os.getenv("FMP_KEY", "")

_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = int(os.getenv("CACHE_TTL", "60"))

def cache_get(key):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < CACHE_TTL: return data
        del _cache[key]
    return None

def cache_set(key, data):
    _cache[key] = (time.time(), data)

_client = None

@asynccontextmanager
async def lifespan(app):
    global _client
    _client = httpx.AsyncClient(timeout=20.0)
    yield
    await _client.aclose()

app = FastAPI(title="OpenTerm API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

async def fetch_json(url, params=None):
    try:
        resp = await _client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/market/overview")
async def market_overview():
    ck = "market_overview"
    cached = cache_get(ck)
    if cached: return cached
    indices = [
        {"symbol": "^GSPC", "name": "S&P 500"}, {"symbol": "^DJI", "name": "Dow Jones"},
        {"symbol": "^IXIC", "name": "NASDAQ"}, {"symbol": "^RUT", "name": "Russell 2000"},
        {"symbol": "^VIX", "name": "VIX"}, {"symbol": "^FTSE", "name": "FTSE 100"},
        {"symbol": "^N225", "name": "Nikkei 225"}, {"symbol": "^TNX", "name": "10Y Treasury"},
    ]
    if FMP_KEY:
        tasks = [fetch_json(f"https://financialmodelingprep.com/api/v3/quote/{i['symbol'].replace('^','%5E')}", {"apikey": FMP_KEY}) for i in indices]
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            data = []
            for i, res in enumerate(results):
                if isinstance(res, list) and res:
                    q = res[0]
                    data.append({"symbol": indices[i]["symbol"], "name": indices[i]["name"], "price": q.get("price",0), "change": q.get("change",0), "changePct": q.get("changesPercentage",0), "volume": q.get("volume",0)})
                else:
                    data.append({**indices[i], "price": 0, "change": 0, "changePct": 0, "volume": 0})
            result = {"indices": data, "timestamp": datetime.utcnow().isoformat()}
            cache_set(ck, result); return result
        except: pass
    if ALPHA_VANTAGE_KEY and ALPHA_VANTAGE_KEY != "demo":
        data = await fetch_json("https://www.alphavantage.co/query", {"function": "GLOBAL_QUOTE", "symbol": "SPY", "apikey": ALPHA_VANTAGE_KEY})
        gq = data.get("Global Quote", {})
        result = {"indices": [{"symbol": "SPY", "name": "S&P 500 ETF", "price": float(gq.get("05. price",0)), "change": float(gq.get("09. change",0)), "changePct": gq.get("10. change percent","0%"), "volume": int(gq.get("06. volume",0))}], "timestamp": datetime.utcnow().isoformat()}
        cache_set(ck, result); return result
    return {"indices": indices, "timestamp": datetime.utcnow().isoformat(), "note": "Demo mode - add API keys to .env"}

@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    symbol = symbol.upper()
    ck = f"quote_{symbol}"
    cached = cache_get(ck)
    if cached: return cached
    if FMP_KEY:
        data = await fetch_json(f"https://financialmodelingprep.com/api/v3/quote/{symbol}", {"apikey": FMP_KEY})
        if isinstance(data, list) and data:
            result = {"quote": data[0], "source": "fmp"}; cache_set(ck, result); return result
    if FINNHUB_KEY:
        data = await fetch_json("https://finnhub.io/api/v1/quote", {"symbol": symbol, "token": FINNHUB_KEY})
        if data.get("c"):
            result = {"quote": {"symbol": symbol, "price": data["c"], "change": data["d"], "changesPercentage": data["dp"], "dayHigh": data["h"], "dayLow": data["l"], "open": data["o"], "previousClose": data["pc"]}, "source": "finnhub"}
            cache_set(ck, result); return result
    data = await fetch_json("https://www.alphavantage.co/query", {"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY})
    gq = data.get("Global Quote", {})
    if gq:
        result = {"quote": {"symbol": gq.get("01. symbol", symbol), "price": float(gq.get("05. price",0)), "change": float(gq.get("09. change",0)), "changesPercentage": float(gq.get("10. change percent","0").replace("%","")), "open": float(gq.get("02. open",0)), "dayHigh": float(gq.get("03. high",0)), "dayLow": float(gq.get("04. low",0)), "volume": int(gq.get("06. volume",0)), "previousClose": float(gq.get("08. previous close",0))}, "source": "alphavantage"}
        cache_set(ck, result); return result
    raise HTTPException(404, "No data")

@app.get("/api/history/{symbol}")
async def get_history(symbol: str, interval: str = "daily", outputsize: str = "compact"):
    symbol = symbol.upper()
    ck = f"history_{symbol}*{interval}*{outputsize}"
    cached = cache_get(ck)
    if cached: return cached
    if FMP_KEY and interval == "daily":
        data = await fetch_json(f"https://financialmodelingprep.com/api/v3/historical-price-full/{symbol}", {"apikey": FMP_KEY})
        if "historical" in data:
            hist = data["historical"][:365] if outputsize == "compact" else data["historical"]
            result = {"symbol": symbol, "interval": interval, "data": [{"date": h["date"], "open": h.get("open"), "high": h.get("high"), "low": h.get("low"), "close": h.get("close"), "volume": h.get("volume")} for h in hist], "source": "fmp"}
            cache_set(ck, result); return result
    fn_map = {"daily": "TIME_SERIES_DAILY", "weekly": "TIME_SERIES_WEEKLY", "monthly": "TIME_SERIES_MONTHLY", "1min": "TIME_SERIES_INTRADAY", "5min": "TIME_SERIES_INTRADAY", "15min": "TIME_SERIES_INTRADAY", "30min": "TIME_SERIES_INTRADAY", "60min": "TIME_SERIES_INTRADAY"}
    params = {"function": fn_map.get(interval, "TIME_SERIES_DAILY"), "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY, "outputsize": outputsize}
    if "min" in interval: params["interval"] = interval
    data = await fetch_json("https://www.alphavantage.co/query", params)
    ts_key = next((k for k in data if "Time Series" in k), None)
    if not ts_key: return {"symbol": symbol, "interval": interval, "data": []}
    series = data[ts_key]
    result = {"symbol": symbol, "interval": interval, "data": [{"date": d, "open": float(v.get("1. open",0)), "high": float(v.get("2. high",0)), "low": float(v.get("3. low",0)), "close": float(v.get("4. close",0)), "volume": int(v.get("5. volume",0))} for d, v in sorted(series.items(), reverse=True)], "source": "alphavantage"}
    cache_set(ck, result); return result

@app.get("/api/fundamentals/{symbol}")
async def get_fundamentals(symbol: str):
    symbol = symbol.upper()
    ck = f"fundamentals_{symbol}"
    cached = cache_get(ck)
    if cached: return cached
    result = {"symbol": symbol}
    if FMP_KEY:
        try:
            profile, ratios = await asyncio.gather(fetch_json(f"https://financialmodelingprep.com/api/v3/profile/{symbol}", {"apikey": FMP_KEY}), fetch_json(f"https://financialmodelingprep.com/api/v3/ratios-ttm/{symbol}", {"apikey": FMP_KEY}))
            if isinstance(profile, list) and profile: result["profile"] = profile[0]
            if isinstance(ratios, list) and ratios: result["ratios"] = ratios[0]
            result["source"] = "fmp"; cache_set(ck, result); return result
        except: pass
    data = await fetch_json("https://www.alphavantage.co/query", {"function": "OVERVIEW", "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY})
    if data and "Symbol" in data:
        result["profile"] = {"companyName": data.get("Name"), "sector": data.get("Sector"), "industry": data.get("Industry"), "description": data.get("Description"), "mktCap": data.get("MarketCapitalization"), "exchange": data.get("Exchange")}
        result["ratios"] = {"peRatioTTM": data.get("PERatio"), "pegRatioTTM": data.get("PEGRatio"), "dividendYielPercentageTTM": data.get("DividendYield"), "returnOnEquityTTM": data.get("ReturnOnEquityTTM"), "priceToBookRatioTTM": data.get("PriceToBookRatio"), "beta": data.get("Beta"), "52WeekHigh": data.get("52WeekHigh"), "52WeekLow": data.get("52WeekLow")}
        result["source"] = "alphavantage"; cache_set(ck, result); return result
    return result

@app.get("/api/news")
async def get_news(symbol: Optional[str] = None, category: str = "general", limit: int = 20):
    ck = f"news_{symbol}*{category}*{limit}"
    cached = cache_get(ck)
    if cached: return cached
    articles = []
    if FINNHUB_KEY:
        if symbol:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            week_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
            data = await fetch_json("https://finnhub.io/api/v1/company-news", {"symbol": symbol.upper(), "from": week_ago, "to": today, "token": FINNHUB_KEY})
        else:
            data = await fetch_json("https://finnhub.io/api/v1/news", {"category": category, "token": FINNHUB_KEY})
        if isinstance(data, list):
            for a in data[:limit]:
                articles.append({"headline": a.get("headline",""), "summary": a.get("summary",""), "source": a.get("source",""), "url": a.get("url",""), "image": a.get("image",""), "datetime": a.get("datetime",0), "related": a.get("related","")})
    if not articles and NEWS_API_KEY:
        params = {"category": "business", "language": "en", "pageSize": limit, "apiKey": NEWS_API_KEY}
        url = "https://newsapi.org/v2/top-headlines"
        if symbol: url = "https://newsapi.org/v2/everything"; params = {"q": symbol, "language": "en", "pageSize": limit, "sortBy": "publishedAt", "apiKey": NEWS_API_KEY}
        data = await fetch_json(url, params)
        for a in data.get("articles", []):
            articles.append({"headline": a.get("title",""), "summary": a.get("description",""), "source": a.get("source",{}).get("name",""), "url": a.get("url",""), "image": a.get("urlToImage",""), "datetime": a.get("publishedAt","")})
    result = {"articles": articles, "timestamp": datetime.utcnow().isoformat()}
    cache_set(ck, result); return result

@app.get("/api/crypto")
async def get_crypto(limit: int = 20):
    ck = f"crypto_{limit}"
    cached = cache_get(ck)
    if cached: return cached
    data = await fetch_json("https://api.coingecko.com/api/v3/coins/markets", {"vs_currency": "usd", "order": "market_cap_desc", "per_page": limit, "page": 1, "sparkline": "true", "price_change_percentage": "1h,24h,7d"})
    result = {"coins": [{"id": c["id"], "symbol": c["symbol"].upper(), "name": c["name"], "image": c.get("image"), "price": c.get("current_price"), "marketCap": c.get("market_cap"), "volume24h": c.get("total_volume"), "change1h": c.get("price_change_percentage_1h_in_currency"), "change24h": c.get("price_change_percentage_24h_in_currency"), "change7d": c.get("price_change_percentage_7d_in_currency"), "sparkline": c.get("sparkline_in_7d",{}).get("price",[]), "rank": c.get("market_cap_rank")} for c in data], "timestamp": datetime.utcnow().isoformat()}
    cache_set(ck, result); return result

@app.get("/api/forex")
async def get_forex():
    ck = "forex"
    cached = cache_get(ck)
    if cached: return cached
    if FINNHUB_KEY:
        try:
            data = await fetch_json("https://finnhub.io/api/v1/forex/rates", {"base": "USD", "token": FINNHUB_KEY})
            rates = data.get("quote", {})
            result = {"pairs": [{"pair": f"USD/{k}", "rate": v} for k, v in list(rates.items())[:20]], "base": "USD", "timestamp": datetime.utcnow().isoformat()}
            cache_set(ck, result); return result
        except: pass
    return {"pairs": [], "note": "Set FINNHUB_KEY for forex data"}

@app.get("/api/macro-dashboard")
async def macro_dashboard():
    ck = "macro_dashboard"
    cached = cache_get(ck)
    if cached: return cached
    if not FRED_KEY: return {"data": {}, "note": "Set FRED_KEY for macro data"}
    series = {"DFF": "Fed Funds Rate", "DGS10": "10Y Treasury", "DGS2": "2Y Treasury", "T10Y2Y": "10Y-2Y Spread", "UNRATE": "Unemployment", "CPIAUCSL": "CPI", "MORTGAGE30US": "30Y Mortgage", "UMCSENT": "Consumer Sentiment"}
    tasks = [fetch_json("https://api.stlouisfed.org/fred/series/observations", {"series_id": sid, "api_key": FRED_KEY, "file_type": "json", "sort_order": "desc", "limit": 1}) for sid in series]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    dashboard = {}
    for sid, res in zip(series, results):
        if isinstance(res, dict) and "observations" in res and res["observations"]:
            obs = res["observations"][0]
            dashboard[sid] = {"name": series[sid], "value": obs["value"], "date": obs["date"]}
    result = {"data": dashboard, "timestamp": datetime.utcnow().isoformat()}
    cache_set(ck, result); return result

@app.get("/api/earnings")
async def earnings_calendar():
    ck = "earnings"
    cached = cache_get(ck)
    if cached: return cached
    if FINNHUB_KEY:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        future = (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d")
        data = await fetch_json("https://finnhub.io/api/v1/calendar/earnings", {"from": today, "to": future, "token": FINNHUB_KEY})
        result = {"earnings": data.get("earningsCalendar", []), "timestamp": datetime.utcnow().isoformat()}
        cache_set(ck, result); return result
    return {"earnings": [], "note": "Set FINNHUB_KEY for earnings data"}

@app.get("/api/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    ck = f"search_{q}"
    cached = cache_get(ck)
    if cached: return cached
    if FMP_KEY:
        data = await fetch_json("https://financialmodelingprep.com/api/v3/search", {"query": q, "apikey": FMP_KEY, "limit": 10})
        if isinstance(data, list): result = {"results": data}; cache_set(ck, result); return result
    if FINNHUB_KEY:
        data = await fetch_json("https://finnhub.io/api/v1/search", {"q": q, "token": FINNHUB_KEY})
        result = {"results": data.get("result", [])}; cache_set(ck, result); return result
    data = await fetch_json("https://www.alphavantage.co/query", {"function": "SYMBOL_SEARCH", "keywords": q, "apikey": ALPHA_VANTAGE_KEY})
    result = {"results": data.get("bestMatches", [])}; cache_set(ck, result); return result

_watchlists = {"default": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"]}

@app.get("/api/watchlist/{name}")
async def get_watchlist(name: str = "default"):
    return {"name": name, "symbols": _watchlists.get(name, [])}

@app.post("/api/watchlist/{name}/add")
async def add_to_watchlist(name: str, symbol: str = Query(...)):
    symbol = symbol.upper()
    if name not in _watchlists: _watchlists[name] = []
    if symbol not in _watchlists[name]: _watchlists[name].append(symbol)
    return {"name": name, "symbols": _watchlists[name]}

@app.post("/api/watchlist/{name}/remove")
async def remove_from_watchlist(name: str, symbol: str = Query(...)):
    symbol = symbol.upper()
    if name in _watchlists and symbol in _watchlists[name]: _watchlists[name].remove(symbol)
    return {"name": name, "symbols": _watchlists.get(name, [])}

@app.get("/api/health")
async def health():
    return {"status": "ok", "configured_apis": {"alpha_vantage": bool(ALPHA_VANTAGE_KEY and ALPHA_VANTAGE_KEY != "demo"), "finnhub": bool(FINNHUB_KEY), "fred": bool(FRED_KEY), "newsapi": bool(NEWS_API_KEY), "fmp": bool(FMP_KEY)}, "cache_entries": len(_cache), "timestamp": datetime.utcnow().isoformat()}

# Serve frontend static files
DIST = Path(__file__).parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = DIST / full_path
        if file.exists() and file.is_file(): return FileResponse(file)
        return FileResponse(DIST / "index.html")
