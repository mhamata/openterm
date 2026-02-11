import React,{useState,useEffect,useCallback,useRef,useMemo} from 'react'

async function api(path){try{const r=await fetch(path);if(!r.ok)throw new Error(r.status);return await r.json()}catch(e){console.error(`API ${path}`,e);return null}}

const fmt={
  price:v=>v==null?'—':Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),
  pct:v=>v==null?'—':`${Number(v)>=0?'+':''}${Number(v).toFixed(2)}%`,
  compact:v=>{if(v==null)return'—';const n=Number(v);if(Math.abs(n)>=1e12)return(n/1e12).toFixed(2)+'T';if(Math.abs(n)>=1e9)return(n/1e9).toFixed(2)+'B';if(Math.abs(n)>=1e6)return(n/1e6).toFixed(2)+'M';if(Math.abs(n)>=1e3)return(n/1e3).toFixed(1)+'K';return n.toLocaleString()},
}
const clr=v=>{if(v==null)return'#8b93a1';const n=Number(v);return n>0?'#00d26a':n<0?'#ff3b3b':'#8b93a1'}

const S={
  root:{height:'100vh',display:'flex',flexDirection:'column',background:'#06080a',color:'#c8cdd3',overflow:'hidden'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height:44,minHeight:44,background:'#0d1117',borderBottom:'1px solid #1c2333',fontFamily:"'JetBrains Mono',monospace",fontSize:12},
  logo:{fontWeight:700,fontSize:14,color:'#ff9500',letterSpacing:2,textTransform:'uppercase'},
  searchBox:{background:'#161b22',border:'1px solid #30363d',borderRadius:4,padding:'5px 12px',color:'#c8cdd3',fontSize:13,outline:'none',width:280,fontFamily:"'JetBrains Mono',monospace"},
  tabBar:{display:'flex',background:'#0d1117',borderBottom:'1px solid #1c2333',overflowX:'auto',minHeight:32},
  tab:a=>({padding:'6px 16px',cursor:'pointer',fontSize:11,letterSpacing:0.5,fontFamily:"'JetBrains Mono',monospace",textTransform:'uppercase',color:a?'#ff9500':'#6e7681',fontWeight:a?600:400,borderBottom:a?'2px solid #ff9500':'2px solid transparent',whiteSpace:'nowrap',background:'transparent',userSelect:'none'}),
  grid:{flex:1,display:'grid',gap:1,padding:1,overflow:'hidden',background:'#1c2333'},
  panel:{background:'#0d1117',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0},
  ph:{padding:'8px 12px',fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'#ff9500',fontFamily:"'JetBrains Mono',monospace",borderBottom:'1px solid #1c2333',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0},
  pb:{flex:1,overflow:'auto',padding:8,scrollbarWidth:'thin',scrollbarColor:'#30363d #0d1117'},
  tbl:{width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:"'JetBrains Mono',monospace"},
  th:{textAlign:'left',padding:'4px 8px',fontSize:10,color:'#6e7681',textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid #1c2333',fontWeight:500,position:'sticky',top:0,background:'#0d1117',zIndex:1},
  td:{padding:'5px 8px',borderBottom:'1px solid #0e1318',whiteSpace:'nowrap'},
  tdr:{padding:'5px 8px',borderBottom:'1px solid #0e1318',textAlign:'right',whiteSpace:'nowrap'},
  badge:c=>({display:'inline-block',padding:'1px 6px',borderRadius:3,fontSize:11,fontWeight:600,color:c,background:c+'15',fontFamily:"'JetBrains Mono',monospace"}),
  btn:{padding:'4px 10px',background:'#161b22',border:'1px solid #30363d',borderRadius:4,color:'#c8cdd3',fontSize:11,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"},
  dot:ok=>({width:6,height:6,borderRadius:'50%',background:ok?'#00d26a':'#ff3b3b',display:'inline-block'}),
}

function Loader({text='Loading…'}){return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#6e7681',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}><span style={{animation:'pulse 1.5s infinite'}}>{text}</span><style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style></div>}
function Panel({title,badge,extra,children}){return<div style={S.panel}><div style={S.ph}><span>{title}{badge&&<span style={{marginLeft:8,fontSize:9,color:'#8b93a1',fontWeight:400}}>{badge}</span>}</span>{extra}</div><div style={S.pb}>{children}</div></div>}

function Clock(){const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i)},[]);const f=(d,tz)=>d.toLocaleTimeString('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});return<div style={{display:'flex',gap:16,alignItems:'center',fontSize:11,color:'#8b93a1'}}><span>NYC {f(n,'America/New_York')}</span><span>LDN {f(n,'Europe/London')}</span><span>TKY {f(n,'Asia/Tokyo')}</span></div>}

function MarketOverview({data,onSelect}){const[h,sH]=useState(null);if(!data?.indices)return<Loader/>;return<table style={S.tbl}><thead><tr><th style={S.th}>Index</th><th style={{...S.th,textAlign:'right'}}>Last</th><th style={{...S.th,textAlign:'right'}}>Chg</th><th style={{...S.th,textAlign:'right'}}>Chg%</th></tr></thead><tbody>{data.indices.map((x,i)=><tr key={i} style={{cursor:'pointer',background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)} onClick={()=>onSelect?.(x.symbol)}><td style={{...S.td,color:'#e6edf3',fontWeight:500}}>{x.name||x.symbol}</td><td style={S.tdr}>{fmt.price(x.price)}</td><td style={{...S.tdr,color:clr(x.change)}}>{x.change!=null?(x.change>=0?'+':'')+Number(x.change).toFixed(2):'—'}</td><td style={S.tdr}><span style={S.badge(clr(x.changePct))}>{typeof x.changePct==='string'?x.changePct:fmt.pct(x.changePct)}</span></td></tr>)}</tbody></table>}

function Watchlist({symbols,quotes,onSelect,onRemove}){const[h,sH]=useState(null);return<table style={S.tbl}><thead><tr><th style={S.th}>Sym</th><th style={{...S.th,textAlign:'right'}}>Last</th><th style={{...S.th,textAlign:'right'}}>Chg%</th><th style={{...S.th,textAlign:'right'}}>Vol</th><th style={{...S.th,width:24}}></th></tr></thead><tbody>{symbols.map((sym,i)=>{const q=quotes[sym]?.quote||{};return<tr key={sym} style={{cursor:'pointer',background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)} onClick={()=>onSelect?.(sym)}><td style={{...S.td,color:'#58a6ff',fontWeight:600}}>{sym}</td><td style={S.tdr}>{fmt.price(q.price)}</td><td style={S.tdr}><span style={S.badge(clr(q.changesPercentage))}>{fmt.pct(q.changesPercentage)}</span></td><td style={{...S.tdr,color:'#6e7681'}}>{fmt.compact(q.volume)}</td><td style={{...S.tdr,padding:'2px 4px'}}><button onClick={e=>{e.stopPropagation();onRemove?.(sym)}} style={{...S.btn,padding:'1px 5px',fontSize:10,color:'#6e7681'}}>✕</button></td></tr>})}</tbody></table>}

function PriceChart({symbol,data}){const cRef=useRef(null),wRef=useRef(null),[tip,sTip]=useState(null);const cd=useMemo(()=>{if(!data?.data?.length)return null;return[...data.data].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-120)},[data]);useEffect(()=>{if(!cd||!cRef.current||!wRef.current)return;const cv=cRef.current,ct=wRef.current,rc=ct.getBoundingClientRect(),dp=window.devicePixelRatio||1;cv.width=rc.width*dp;cv.height=rc.height*dp;cv.style.width=rc.width+'px';cv.style.height=rc.height+'px';const c=cv.getContext('2d');c.scale(dp,dp);const W=rc.width,H=rc.height,cls=cd.map(d=>d.close),mn=Math.min(...cls)*.998,mx=Math.max(...cls)*1.002,rg=mx-mn||1,p={t:20,r:60,b:30,l:10},cW=W-p.l-p.r,cH=H-p.t-p.b;c.fillStyle='#0d1117';c.fillRect(0,0,W,H);c.strokeStyle='#161b22';c.lineWidth=1;for(let i=0;i<=4;i++){const y=p.t+(cH/4)*i;c.beginPath();c.moveTo(p.l,y);c.lineTo(W-p.r,y);c.stroke();c.fillStyle='#6e7681';c.font='10px "JetBrains Mono",monospace';c.textAlign='left';c.fillText((mx-(rg/4)*i).toFixed(2),W-p.r+6,y+4)}const pos=cls[cls.length-1]>=cls[0],lc=pos?'#00d26a':'#ff3b3b',xS=cW/(cls.length-1),tY=v=>p.t+cH-((v-mn)/rg)*cH,gr=c.createLinearGradient(0,p.t,0,H-p.b);gr.addColorStop(0,pos?'rgba(0,210,106,0.15)':'rgba(255,59,59,0.15)');gr.addColorStop(1,'rgba(13,17,23,0)');c.beginPath();c.moveTo(p.l,tY(cls[0]));cls.forEach((v,i)=>c.lineTo(p.l+i*xS,tY(v)));c.lineTo(p.l+(cls.length-1)*xS,H-p.b);c.lineTo(p.l,H-p.b);c.closePath();c.fillStyle=gr;c.fill();c.beginPath();c.moveTo(p.l,tY(cls[0]));cls.forEach((v,i)=>c.lineTo(p.l+i*xS,tY(v)));c.strokeStyle=lc;c.lineWidth=1.5;c.stroke();const ly=tY(cls[cls.length-1]);c.setLineDash([4,4]);c.strokeStyle=lc+'80';c.lineWidth=1;c.beginPath();c.moveTo(p.l,ly);c.lineTo(W-p.r,ly);c.stroke();c.setLineDash([]);c.fillStyle=lc;c.fillRect(W-p.r,ly-9,58,18);c.fillStyle='#0d1117';c.font='bold 10px "JetBrains Mono",monospace';c.textAlign='center';c.fillText(cls[cls.length-1].toFixed(2),W-p.r+29,ly+3);c.fillStyle='#6e7681';c.font='9px "JetBrains Mono",monospace';c.textAlign='center';const ds=Math.floor(cls.length/5);for(let i=0;i<cls.length;i+=ds){const d=cd[i]?.date;if(d)c.fillText(d.substring(5,10),p.l+i*xS,H-8)}},[cd]);const hm=useCallback(e=>{if(!cd||!wRef.current)return;const rc=wRef.current.getBoundingClientRect(),x=e.clientX-rc.left,cW=rc.width-70,idx=Math.round(((x-10)/cW)*(cd.length-1));if(idx>=0&&idx<cd.length)sTip({...cd[idx],x:e.clientX-rc.left,y:e.clientY-rc.top})},[cd]);return<div ref={wRef} style={{width:'100%',height:'100%',position:'relative'}} onMouseMove={hm} onMouseLeave={()=>sTip(null)}><canvas ref={cRef} style={{display:'block',width:'100%',height:'100%'}}/>{tip&&<div style={{position:'absolute',left:tip.x+12,top:tip.y-40,background:'#1c2333ee',padding:'6px 10px',borderRadius:4,fontSize:11,fontFamily:"'JetBrains Mono',monospace",border:'1px solid #30363d',pointerEvents:'none',zIndex:10}}><div style={{color:'#8b93a1'}}>{tip.date}</div><div>O <span style={{color:'#e6edf3'}}>{fmt.price(tip.open)}</span> H <span style={{color:'#e6edf3'}}>{fmt.price(tip.high)}</span></div><div>L <span style={{color:'#e6edf3'}}>{fmt.price(tip.low)}</span> C <span style={{color:'#e6edf3'}}>{fmt.price(tip.close)}</span></div></div>}{!cd&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><Loader/></div>}</div>}

function NewsPanel({news}){const[h,sH]=useState(null);if(!news?.articles?.length)return<Loader text="Loading news..."/>;return<div>{news.articles.map((a,i)=><a key={i} href={a.url} target="_blank" rel="noreferrer" style={{display:'block',padding:'8px 10px',textDecoration:'none',borderBottom:'1px solid #161b22',background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)}><div style={{fontSize:12,color:'#e6edf3',lineHeight:1.4,marginBottom:4}}>{a.headline}</div><div style={{display:'flex',gap:12,fontSize:10,color:'#6e7681'}}><span style={{color:'#ff9500'}}>{a.source}</span><span>{a.datetime?new Date(a.datetime*1000).toLocaleString():''}</span></div></a>)}</div>}

function CryptoPanel({data}){const[h,sH]=useState(null);if(!data?.coins?.length)return<Loader text="Loading crypto..."/>;return<table style={S.tbl}><thead><tr><th style={S.th}>#</th><th style={S.th}>Coin</th><th style={{...S.th,textAlign:'right'}}>Price</th><th style={{...S.th,textAlign:'right'}}>24h</th><th style={{...S.th,textAlign:'right'}}>7d</th><th style={{...S.th,textAlign:'right'}}>MCap</th></tr></thead><tbody>{data.coins.map((c,i)=><tr key={c.id} style={{cursor:'pointer',background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)}><td style={{...S.td,color:'#6e7681',fontSize:10}}>{c.rank}</td><td style={{...S.td,fontWeight:600}}><span style={{color:'#e6edf3'}}>{c.symbol}</span><span style={{color:'#6e7681',fontWeight:400,marginLeft:6,fontSize:10}}>{c.name}</span></td><td style={S.tdr}>${fmt.price(c.price)}</td><td style={S.tdr}><span style={S.badge(clr(c.change24h))}>{fmt.pct(c.change24h)}</span></td><td style={S.tdr}><span style={S.badge(clr(c.change7d))}>{fmt.pct(c.change7d)}</span></td><td style={{...S.tdr,color:'#8b93a1'}}>{fmt.compact(c.marketCap)}</td></tr>)}</tbody></table>}

function MacroPanel({data}){if(!data?.data||!Object.keys(data.data).length)return<Loader text="Loading macro..."/>;return<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,padding:4}}>{Object.entries(data.data).map(([k,v])=><div key={k} style={{background:'#161b22',borderRadius:6,padding:'12px 14px',border:'1px solid #1c2333'}}><div style={{fontSize:10,color:'#6e7681',textTransform:'uppercase',letterSpacing:.5,marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>{v.name}</div><div style={{fontSize:22,fontWeight:600,color:'#e6edf3',fontFamily:"'JetBrains Mono',monospace"}}>{v.value==='.'?'—':Number(v.value).toFixed(2)}</div><div style={{fontSize:10,color:'#6e7681',marginTop:4}}>{v.date}</div></div>)}</div>}

function FundamentalsPanel({data}){if(!data?.profile)return<Loader text="Select a stock"/>;const p=data.profile,r=data.ratios||{},kv={display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #161b22',fontSize:12};return<div style={{padding:4}}><div style={{marginBottom:12}}><div style={{fontSize:16,fontWeight:700,color:'#e6edf3'}}>{p.companyName}</div><div style={{fontSize:11,color:'#6e7681',marginTop:2}}>{p.sector} · {p.industry}</div></div>{p.description&&<div style={{fontSize:11,color:'#8b93a1',lineHeight:1.5,marginBottom:12,maxHeight:80,overflow:'hidden'}}>{p.description?.substring(0,300)}…</div>}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>{[['Mkt Cap',fmt.compact(p.mktCap)],['P/E',r.peRatioTTM],['PEG',r.pegRatioTTM],['P/B',r.priceToBookRatioTTM],['Div Yield',r.dividendYielPercentageTTM?Number(r.dividendYielPercentageTTM).toFixed(2)+'%':null],['ROE',r.returnOnEquityTTM],['Beta',r.beta],['52W High',r['52WeekHigh']],['52W Low',r['52WeekLow']]].map(([l,v])=><div key={l} style={kv}><span style={{color:'#6e7681'}}>{l}</span><span style={{color:'#e6edf3',fontFamily:"'JetBrains Mono',monospace"}}>{v??'—'}</span></div>)}</div></div>}

function EarningsPanel({data}){const[h,sH]=useState(null);if(!data?.earnings?.length)return<Loader text="Loading earnings..."/>;return<table style={S.tbl}><thead><tr><th style={S.th}>Date</th><th style={S.th}>Symbol</th><th style={{...S.th,textAlign:'right'}}>Est EPS</th></tr></thead><tbody>{data.earnings.slice(0,30).map((e,i)=><tr key={i} style={{background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)}><td style={{...S.td,color:'#8b93a1'}}>{e.date}</td><td style={{...S.td,color:'#58a6ff',fontWeight:600}}>{e.symbol}</td><td style={S.tdr}>{e.epsEstimate??'—'}</td></tr>)}</tbody></table>}

function ForexPanel({data}){const[h,sH]=useState(null);if(!data?.pairs?.length)return<Loader text="Loading forex..."/>;return<table style={S.tbl}><thead><tr><th style={S.th}>Pair</th><th style={{...S.th,textAlign:'right'}}>Rate</th></tr></thead><tbody>{data.pairs.map((p,i)=><tr key={i} style={{background:h===i?'#161b22':'transparent'}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)}><td style={{...S.td,color:'#58a6ff',fontWeight:500}}>{p.pair}</td><td style={S.tdr}>{Number(p.rate).toFixed(4)}</td></tr>)}</tbody></table>}

function SearchResults({results,onSelect,onClose}){if(!results?.length)return null;return<div style={{position:'absolute',top:42,left:'50%',transform:'translateX(-50%)',background:'#1c2333',border:'1px solid #30363d',borderRadius:6,width:340,maxHeight:300,overflow:'auto',zIndex:100,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>{results.map((r,i)=><div key={i} onClick={()=>{onSelect(r.symbol||r['1. symbol']||'');onClose()}} style={{padding:'8px 14px',cursor:'pointer',borderBottom:'1px solid #161b22',fontSize:12,fontFamily:"'JetBrains Mono',monospace"}} onMouseEnter={e=>e.target.style.background='#161b22'} onMouseLeave={e=>e.target.style.background='transparent'}><span style={{color:'#58a6ff',fontWeight:600}}>{r.symbol||r['1. symbol']}</span><span style={{color:'#6e7681',marginLeft:10,fontSize:11}}>{r.name||r['2. name']||''}</span></div>)}</div>}

const TABS=[{id:'overview',l:'Overview'},{id:'chart',l:'Chart'},{id:'crypto',l:'Crypto'},{id:'macro',l:'Macro'},{id:'forex',l:'Forex'},{id:'news',l:'News'},{id:'earnings',l:'Earnings'}]

export default function App(){
  const[tab,sTab]=useState('overview'),[sym,sSym]=useState('AAPL'),[mob,sMob]=useState(false)
  const[mkt,sMkt]=useState(null),[wl,sWl]=useState([]),[qt,sQt]=useState({}),[hist,sHist]=useState(null)
  const[fund,sFund]=useState(null),[news,sNews]=useState(null),[cry,sCry]=useState(null)
  const[fx,sFx]=useState(null),[mac,sMac]=useState(null),[ear,sEar]=useState(null),[hp,sHp]=useState(null)
  const[sq,sSq]=useState(''),[sr,sSr]=useState(null),stRef=useRef(null)

  useEffect(()=>{const c=()=>sMob(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c)},[])
  useEffect(()=>{api('/api/health').then(sHp);api('/api/market/overview').then(sMkt);api('/api/watchlist/default').then(d=>{if(d?.symbols)sWl(d.symbols)});api('/api/news').then(sNews);api('/api/crypto').then(sCry);api('/api/forex').then(sFx);api('/api/macro-dashboard').then(sMac);api('/api/earnings').then(sEar)},[])
  useEffect(()=>{if(!wl.length)return;wl.forEach(s=>api(`/api/quote/${s}`).then(d=>{if(d)sQt(p=>({...p,[s]:d}))}))},[wl])
  useEffect(()=>{if(!sym)return;api(`/api/history/${sym}`).then(sHist);api(`/api/fundamentals/${sym}`).then(sFund);api(`/api/news?symbol=${sym}`).then(d=>{if(d?.articles?.length)sNews(d)})},[sym])
  useEffect(()=>{const i=setInterval(()=>{api('/api/market/overview').then(d=>d&&sMkt(d));if(sym)api(`/api/quote/${sym}`).then(d=>d&&sQt(p=>({...p,[sym]:d})))},60000);return()=>clearInterval(i)},[sym])

  const doSearch=q=>{sSq(q);if(stRef.current)clearTimeout(stRef.current);if(q.length<1){sSr(null);return};stRef.current=setTimeout(async()=>{const d=await api(`/api/search?q=${encodeURIComponent(q)}`);if(d?.results)sSr(d.results.slice(0,8))},300)}
  const pick=s=>{const c=s.replace('^','');sSym(c);if(mob)sTab('chart')}
  const addWl=()=>{if(sym&&!wl.includes(sym)){sWl(p=>[...p,sym]);api(`/api/watchlist/default/add?symbol=${sym}`)}}
  const rmWl=s=>{sWl(p=>p.filter(x=>x!==s));api(`/api/watchlist/default/remove?symbol=${s}`)}

  const desk={gridTemplateColumns:'280px 1fr 320px',gridTemplateRows:'1fr 1fr'}

  const mobilePanel=()=>{switch(tab){
    case'overview':return<Panel title="Market Overview"><MarketOverview data={mkt} onSelect={pick}/></Panel>
    case'chart':return<Panel title={`${sym} — Chart`} extra={<button style={S.btn} onClick={addWl}>+ Watch</button>}><PriceChart symbol={sym} data={hist}/></Panel>
    case'crypto':return<Panel title="Crypto"><CryptoPanel data={cry}/></Panel>
    case'macro':return<Panel title="Macro"><MacroPanel data={mac}/></Panel>
    case'forex':return<Panel title="Forex"><ForexPanel data={fx}/></Panel>
    case'news':return<Panel title="News"><NewsPanel news={news}/></Panel>
    case'earnings':return<Panel title="Earnings"><EarningsPanel data={ear}/></Panel>
    default:return null}}

  return<div style={S.root}>
    <div style={S.header}>
      <div style={S.logo}>◆ OpenTerm</div>
      <div style={{position:'relative'}}>
        <input style={S.searchBox} placeholder="Search symbol…" value={sq} onChange={e=>doSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&sq){pick(sq.toUpperCase());sSq('');sSr(null)}}}/>
        <SearchResults results={sr} onSelect={s=>{pick(s);sSq('')}} onClose={()=>sSr(null)}/>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>{!mob&&<Clock/>}<span style={S.dot(hp?.status==='ok')} title="API"/></div>
    </div>
    <div style={S.tabBar}>{TABS.map(t=><div key={t.id} style={S.tab(tab===t.id)} onClick={()=>sTab(t.id)}>{t.l}</div>)}</div>

    {mob?<div style={{...S.grid,gridTemplateColumns:'1fr',gridTemplateRows:'1fr'}}>{mobilePanel()}</div>:
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {tab==='overview'&&<div style={{...S.grid,...desk,flex:1}}>
        <Panel title="Market Overview" badge="INDICES"><MarketOverview data={mkt} onSelect={pick}/></Panel>
        <Panel title={`${sym} — Daily`} extra={<button style={S.btn} onClick={addWl}>+ Watch</button>}><PriceChart symbol={sym} data={hist}/></Panel>
        <Panel title="News" badge="LIVE"><NewsPanel news={news}/></Panel>
        <Panel title="Watchlist" badge={`${wl.length} symbols`}><Watchlist symbols={wl} quotes={qt} onSelect={pick} onRemove={rmWl}/></Panel>
        <Panel title="Fundamentals" badge={sym}><FundamentalsPanel data={fund}/></Panel>
        <Panel title="Crypto" badge="TOP COINS"><CryptoPanel data={cry}/></Panel>
      </div>}
      {tab==='chart'&&<div style={{...S.grid,gridTemplateColumns:'1fr 320px',flex:1}}><Panel title={`${sym} — Chart`} extra={<button style={S.btn} onClick={addWl}>+ Watch</button>}><PriceChart symbol={sym} data={hist}/></Panel><Panel title="Fundamentals" badge={sym}><FundamentalsPanel data={fund}/></Panel></div>}
      {tab==='crypto'&&<div style={{...S.grid,gridTemplateColumns:'1fr',flex:1}}><Panel title="Cryptocurrency Markets" badge="COINGECKO"><CryptoPanel data={cry}/></Panel></div>}
      {tab==='macro'&&<div style={{...S.grid,gridTemplateColumns:'1fr',flex:1}}><Panel title="Economic Indicators" badge="FRED"><MacroPanel data={mac}/></Panel></div>}
      {tab==='forex'&&<div style={{...S.grid,gridTemplateColumns:'1fr 1fr',flex:1}}><Panel title="Forex" badge="MAJOR PAIRS"><ForexPanel data={fx}/></Panel><Panel title="Market Overview"><MarketOverview data={mkt} onSelect={pick}/></Panel></div>}
      {tab==='news'&&<div style={{...S.grid,gridTemplateColumns:'1fr 1fr',flex:1}}><Panel title="News" badge="LIVE"><NewsPanel news={news}/></Panel><Panel title="Earnings" badge="UPCOMING"><EarningsPanel data={ear}/></Panel></div>}
      {tab==='earnings'&&<div style={{...S.grid,gridTemplateColumns:'1fr',flex:1}}><Panel title="Earnings Calendar" badge="14 DAYS"><EarningsPanel data={ear}/></Panel></div>}
    </div>}

    <div style={{height:24,minHeight:24,background:'#0d1117',borderTop:'1px solid #1c2333',display:'flex',alignItems:'center',padding:'0 12px',fontSize:10,color:'#6e7681',fontFamily:"'JetBrains Mono',monospace",justifyContent:'space-between'}}>
      <span>APIs: {hp?Object.entries(hp.configured_apis||{}).map(([k,v])=><span key={k} style={{marginRight:8}}><span style={S.dot(v)}/> {k}</span>):'...'}</span>
      <span>Cache: {hp?.cache_entries??0} · 60s refresh</span>
    </div>
  </div>
}
