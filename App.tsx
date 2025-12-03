
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarData, Position, TradeRecord, Drawing, Alert, ToastMsg, IndicatorType, CrosshairMode, MeasureType } from './types';
import { SYMBOLS, TIMEFRAMES, formatMoney, formatPrice } from './constants';
import { generateHistory } from './utils/engine';
import ChartBoard from './components/ChartBoard';
import IndicatorPane from './components/IndicatorPane';
import Toast from './components/Toast';
import { BackIcon, SearchIcon, StarIcon, PlayIcon, PauseIcon, SettingsIcon, ListIcon, CloseIcon, WalletIcon, MenuIcon, SunIcon, MoonIcon, PencilIcon, TrashIcon, LockIcon, MeasureIcon, CheckIcon, AlertIcon, MagnetIcon, VectorIcon } from './components/Icons';

// Globals
declare var confetti: any;

type ViewState = 'home' | 'replay' | 'history';
type SheetState = 'none' | 'trade' | 'position' | 'settings' | 'more' | 'speed' | 'alerts' | 'overlay' | 'measureConfig';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // --- Navigation & View State ---
  const [view, setView] = useState<ViewState>('home');
  const [activeSheet, setActiveSheet] = useState<SheetState>('none');
  const [theme, setTheme] = useState<Theme>('dark');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  
  // --- Simulation State ---
  const [symbolCode, setSymbolCode] = useState('rb2501');
  const [timeframe, setTimeframe] = useState('5m');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showMA, setShowMA] = useState(true);
  
  // Data
  const [fullData, setFullData] = useState<BarData[]>([]);
  const [displayData, setDisplayData] = useState<BarData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparisonData, setComparisonData] = useState<BarData[]>([]); // For overlay
  const [indicatorType, setIndicatorType] = useState<IndicatorType>(IndicatorType.VOL);
  
  // Advanced Features
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drawMode, setDrawMode] = useState<'line' | 'ray' | null>(null);
  const [showMeasure, setShowMeasure] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertInput, setAlertInput] = useState('');
  const [overlaySymbol, setOverlaySymbol] = useState<string | null>(null);

  // New Modes
  const [crosshairMode, setCrosshairMode] = useState<CrosshairMode>('free');
  const [measureType, setMeasureType] = useState<MeasureType>('range');
  
  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // Default 1x (1000ms)
  const intervalRef = useRef<number | null>(null);
  
  // Account
  const [balance, setBalance] = useState(100000);
  const [position, setPosition] = useState<Position | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  
  // Trade Input
  const [qty, setQty] = useState(1);
  const [showResult, setShowResult] = useState(false);

  // Derived
  const symbol = SYMBOLS.find(s => s.code === symbolCode) || SYMBOLS[0];
  const isLineChart = timeframe === '1m';
  
  const currentBar = displayData.length > 0 ? displayData[displayData.length - 1] : { 
    time: Math.floor(Date.now() / 1000), 
    close: symbol.basePrice, 
    open: symbol.basePrice, 
    high: symbol.basePrice, 
    low: symbol.basePrice, 
    volume: 0 
  };
  const lastPrice = currentBar.close;

  // --- Theme Effect ---
  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToasts(prev => [...prev, { id: Date.now(), message: msg, type }]);
  };
  const removeToast = (id: number) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Logic ---

  const enterReplay = (code: string) => {
    setSymbolCode(code);
    setView('replay');
    initializeData(code, timeframe);
    // Reset account & tools
    setBalance(100000);
    setPosition(null);
    setTrades([]);
    setActiveSheet('none');
    setIsPlaying(false);
    setShowResult(false);
    setDrawings([]);
    setAlerts([]);
    setComparisonData([]);
    setOverlaySymbol(null);
  };

  const goHome = () => {
    setIsPlaying(false);
    setView('home');
    setActiveSheet('none');
  };

  const initializeData = (code: string, tf: string) => {
    const sym = SYMBOLS.find(s => s.code === code) || SYMBOLS[0];
    let tfMin = 5;
    if (tf === '1m') tfMin = 1;
    if (tf === '5m') tfMin = 5;
    if (tf === '15m') tfMin = 15;
    if (tf === '30m') tfMin = 30;
    if (tf === '1D') tfMin = 1440;

    const history = generateHistory(sym, 3000, tfMin);
    setFullData(history);
    
    const startIndex = 200;
    setCurrentIndex(startIndex);
    setDisplayData(history.slice(0, startIndex));
    setMarkers([]);
  };

  const handleTimeframeChange = (newTf: string) => {
    setTimeframe(newTf);
    initializeData(symbolCode, newTf);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value);
      setCurrentIndex(idx);
      setDisplayData(fullData.slice(0, idx));
      if(overlaySymbol && comparisonData.length > 0) {
          const ovFull = generateHistory(SYMBOLS.find(s=>s.code===overlaySymbol)!, 3000, 5); // simplified
          setComparisonData(ovFull.slice(0, idx));
      }
  };

  const tick = useCallback(() => {
    if (currentIndex >= fullData.length - 1) {
      setIsPlaying(false);
      setShowResult(true);
      return;
    }
    const nextIndex = currentIndex + 1;
    const nextBar = fullData[nextIndex];
    
    // Check Alerts
    alerts.forEach(a => {
        if(a.active) {
            const prevBar = displayData[displayData.length-1];
            if ((prevBar.close < a.price && nextBar.close >= a.price) || (prevBar.close > a.price && nextBar.close <= a.price)) {
                addToast(`价格到达预警: ${a.price}`, 'info');
                setAlerts(prev => prev.map(al => al.id === a.id ? { ...al, active: false } : al));
            }
        }
    });

    setCurrentIndex(nextIndex);
    setDisplayData(fullData.slice(0, nextIndex));
    
    // Sync Comparison
    if(overlaySymbol && comparisonData.length > 0) {
        const lastOv = comparisonData[comparisonData.length-1];
        const nextOvClose = lastOv.close * (1 + (Math.random()-0.5)*0.001);
        const nextOv = { ...lastOv, time: nextBar.time, close: nextOvClose };
        setComparisonData(prev => [...prev, nextOv]);
    }
    
  }, [currentIndex, fullData, alerts, displayData, comparisonData, overlaySymbol]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(tick, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, tick]);

  // Calculations
  const pnl = position ? (lastPrice - position.entryPrice) * position.qty * symbol.multiplier : 0;
  const equity = balance + pnl;
  const change = displayData.length > 1 ? currentBar.close - (displayData[displayData.length-2].close) : 0;
  const changePercent = displayData.length > 1 ? (change / displayData[displayData.length-2].close) * 100 : 0;

  // Trading
  const executeTrade = (dir: 1 | -1) => {
    if (qty < 1) {
        addToast("最少交易1手", 'error');
        return;
    }

    const price = lastPrice;
    const time = currentBar.time;

    // Check for Reversal Logic: If holding pos and new trade is opposite AND qty > pos.qty
    if (position && position.symbol === symbolCode && Math.sign(position.qty) !== dir) {
        const absPosQty = Math.abs(position.qty);
        if (qty > absPosQty) {
            // Reversal Triggered
            const closeQty = absPosQty;
            const openQty = qty - closeQty;
            
            // 1. Close Existing
            const closePnl = (price - position.entryPrice) * closeQty * Math.sign(position.qty) * symbol.multiplier;
            const newBalance = balance + closePnl;
            
            // Check Margin for the New Position (openQty)
            const requiredMargin = price * openQty * symbol.multiplier * symbol.marginRate;
            if (newBalance < requiredMargin) {
                 addToast(`反手资金不足! 需 ${formatMoney(requiredMargin)}`, 'error');
                 return;
            }

            // Execute Close
            setBalance(newBalance);
            setTrades(t => [...t, { id: Date.now(), time, price, qty: closeQty, dir, action: 'Close', pnl: closePnl }]);
            
            // Execute Open (Reversal)
            setPosition({ symbol: symbolCode, qty: openQty * dir, entryPrice: price });
            setTrades(t => [...t, { id: Date.now()+1, time, price, qty: openQty, dir, action: 'Open' }]);
            
            setMarkers(m => [
                ...m, 
                { time, position: dir===1?'belowBar':'aboveBar', color: '#d4af37', shape: 'circle', text: 'Rev' }
            ]);
            
            addToast(`触发反手: 平${closeQty} 开${openQty}`, 'success');
            return;
        }
    }

    // Standard Open Logic (Add to pos or Open new)
    if (!position || Math.sign(position.qty) === dir) {
        const requiredMargin = price * qty * symbol.multiplier * symbol.marginRate;
        if (balance < requiredMargin) {
            addToast(`资金不足! 需保证金 ${formatMoney(requiredMargin)}`, 'error');
            return;
        }
    }

    if (position) {
        if (position.symbol === symbolCode && Math.sign(position.qty) !== dir) {
            // Partial Close or Full Close
            const closeQty = Math.min(Math.abs(position.qty), qty);
            const realizedPnl = (price - position.entryPrice) * closeQty * Math.sign(position.qty) * symbol.multiplier;
            setBalance(b => b + realizedPnl);
            
            const remaining = Math.abs(position.qty) - closeQty;
            if (remaining === 0) {
                setPosition(null);
            } else {
                setPosition({ ...position, qty: remaining * Math.sign(position.qty) });
            }
            setTrades(t => [...t, { id: Date.now(), time, price, qty: closeQty, dir, action: 'Close', pnl: realizedPnl }]);
            setMarkers(m => [...m, { 
                time, position: dir === 1 ? 'belowBar' : 'aboveBar', 
                color: dir === 1 ? '#ff3b30' : '#34c759', 
                shape: dir === 1 ? 'arrowUp' : 'arrowDown',
                text: 'C' 
            }]);
            addToast(`平仓成功 ${closeQty}手 盈亏 ${Math.floor(realizedPnl)}`, realizedPnl >= 0 ? 'success' : 'error');
            return;
        }
    }

    const newPosQty = (position ? position.qty : 0) + (dir * qty);
    const avgPrice = position 
        ? ((Math.abs(position.qty) * position.entryPrice) + (qty * price)) / (Math.abs(position.qty) + qty)
        : price;
        
    setPosition({ symbol: symbolCode, qty: newPosQty, entryPrice: avgPrice });
    
    setTrades(t => [...t, { id: Date.now(), time, price, qty, dir, action: 'Open' }]);
    
    setMarkers(m => [...m, { 
        time, position: dir === 1 ? 'belowBar' : 'aboveBar', 
        color: dir === 1 ? '#ff3b30' : '#34c759', 
        shape: dir === 1 ? 'arrowUp' : 'arrowDown',
        text: dir === 1 ? 'O' : 'O'
    }]);
    addToast(`${dir===1?'买入开多':'卖出开空'} ${qty}手`, 'success');
  };

  const closePosition = () => {
    if(!position) return;
    const dir = position.qty > 0 ? -1 : 1;
    const price = lastPrice;
    const time = currentBar.time;
    const pnlVal = (price - position.entryPrice) * position.qty * symbol.multiplier;
    
    setBalance(b => b + pnlVal);
    setTrades(t => [...t, { id: Date.now(), time, price, qty: Math.abs(position.qty), dir, action: 'Close', pnl: pnlVal }]);
    setMarkers(m => [...m, { 
        time, position: dir === 1 ? 'belowBar' : 'aboveBar', 
        color: '#d4af37', 
        shape: 'circle',
        text: 'Close' 
    }]);
    setPosition(null);
    setActiveSheet('none');
    addToast(`全仓平仓完成 盈亏 ${Math.floor(pnlVal)}`, pnlVal >= 0 ? 'success' : 'error');
  };

  const handleOverlaySelect = (code: string) => {
      setOverlaySymbol(code);
      const sym = SYMBOLS.find(s => s.code === code);
      if (sym) {
         const ovData = generateHistory({ ...sym }, fullData.length, 5); 
         setComparisonData(ovData.slice(0, displayData.length));
         setActiveSheet('none');
         addToast(`已叠加: ${sym.name}`, 'success');
      }
  };

  const addAlert = () => {
      const p = parseFloat(alertInput);
      if (p > 0) {
          setAlerts([...alerts, { id: Date.now(), price: p, active: true }]);
          setAlertInput('');
          addToast(`预警添加成功: ${p}`, 'success');
      }
  };
  
  const clearDrawings = () => {
      const locked = drawings.filter(d => d.locked);
      setDrawings(locked);
      addToast(locked.length > 0 ? '已清除未锁定画线' : '画线已清除', 'success');
  };
  
  const startMeasure = () => {
      if (isLineChart && measureType === 'range') {
          addToast('分时图不支持区间测量，请切换K线或使用两点模式', 'error');
          return;
      }
      setShowMeasure(true);
      setActiveSheet('none');
  };

  // ... (Views for History, Home are same) ...
  if (view === 'history') {
      return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-app text-gray-900 dark:text-textMain font-sans">
             <header className="flex items-center gap-2 p-4 bg-white dark:bg-panel border-b border-gray-200 dark:border-border">
                 <div onClick={() => setView('replay')} className="cursor-pointer"><BackIcon /></div>
                 <span className="font-bold text-lg">全部交易记录</span>
             </header>
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {trades.length === 0 && <div className="text-center text-gray-400 mt-10">暂无交易记录</div>}
                 {trades.slice().reverse().map((t, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-4 bg-white dark:bg-panel rounded-xl border border-gray-200 dark:border-border shadow-sm">
                        <div className="flex flex-col">
                            <span className="font-mono text-gray-400 dark:text-textSub text-xs">{new Date(t.time * 1000).toLocaleString()}</span>
                            <span className={`font-bold mt-1 ${t.dir === 1 ? 'text-up' : 'text-down'}`}>
                                {t.action === 'Open' ? '开仓' : '平仓'} {t.dir === 1 ? '买入' : '卖出'}
                            </span>
                        </div>
                        <div className="flex flex-col text-right">
                             <span className="font-mono">@{formatPrice(t.price, symbolCode)} x {t.qty}</span>
                             {t.pnl !== undefined && (
                                 <span className={`font-mono font-bold ${t.pnl > 0 ? 'text-up' : 'text-down'}`}>
                                     {t.pnl > 0 ? '+' : ''}{Math.floor(t.pnl)}
                                 </span>
                             )}
                        </div>
                    </div>
                 ))}
             </div>
        </div>
      );
  }

  if (view === 'home') {
    const hotSymbols = SYMBOLS.filter(s => s.isHot);
    const otherSymbols = SYMBOLS.filter(s => !s.isHot);

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-app text-gray-900 dark:text-textMain overflow-y-auto transition-colors duration-300 font-sans">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-panel/80 backdrop-blur-md border-b border-gray-200 dark:border-border p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <ListIcon />
                    <span className="font-bold text-lg tracking-tight">市场行情</span>
                </div>
                <div onClick={toggleTheme} className="cursor-pointer text-gray-500 dark:text-textSub">
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div className="text-sm font-bold text-gray-500 ml-1 flex items-center gap-1">
                     <span className="text-red-500">🔥</span> 热门精选
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {hotSymbols.map(s => (
                        <div key={s.code} onClick={() => enterReplay(s.code)}
                             className="bg-white dark:bg-panel border border-gray-200 dark:border-border p-4 rounded-2xl active:scale-[0.98] transition-all shadow-sm cursor-pointer relative overflow-hidden group">
                             <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-bl-lg">HOT</div>
                             <div className="font-bold text-gray-900 dark:text-white">{s.name}</div>
                             <div className="flex justify-between items-end mt-2">
                                <div className="text-xs text-gray-400 dark:text-textSub font-mono">{s.code.toUpperCase()}</div>
                                <div className="font-mono font-bold text-lg text-accent">{s.basePrice}</div>
                             </div>
                        </div>
                    ))}
                </div>

                <div className="text-sm font-bold text-gray-500 ml-1">全部标的</div>
                <div className="space-y-3">
                    {otherSymbols.map(s => (
                        <div key={s.code} onClick={() => enterReplay(s.code)}
                             className="bg-white dark:bg-panel border border-gray-200 dark:border-border p-4 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all shadow-sm cursor-pointer">
                            <div>
                                <div className="font-bold text-base text-gray-900 dark:text-white">{s.name}</div>
                                <div className="text-xs text-gray-400 dark:text-textSub font-mono mt-1">{s.code.toUpperCase()}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-lg text-gray-900 dark:text-textMain">{s.basePrice}</div>
                                <div className="text-xs text-accent">复盘</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-app text-gray-900 dark:text-textMain font-sans select-none overflow-hidden transition-colors duration-300">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Portrait Header Group: Hidden in Landscape */}
      <div className="flex flex-col shrink-0 landscape:hidden">
          {/* 1. Header */}
          <header className="flex items-center justify-between px-4 h-[44px] bg-white dark:bg-panel border-b border-gray-200 dark:border-border shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-2 cursor-pointer active:opacity-60" onClick={goHome}>
                <BackIcon />
                <div>
                    <span className="font-bold text-base">{symbol.name}</span>
                    <span className="ml-2 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">{symbolCode.toUpperCase()}</span>
                </div>
            </div>
            <div className="flex items-center gap-4 text-gray-400 dark:text-textSub">
                <div onClick={() => setIsFavorite(!isFavorite)}><StarIcon filled={isFavorite} /></div>
                <SearchIcon />
            </div>
          </header>

          {/* 2. Info Bar */}
          <div className="flex items-center px-4 py-3 bg-white dark:bg-panel border-b border-gray-200 dark:border-border shrink-0 z-10">
            <div className="flex-1">
                <div className={`text-4xl font-bold font-mono tracking-tighter leading-none ${change >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatPrice(lastPrice, symbolCode)}
                </div>
                <div className="flex gap-3 text-xs font-mono mt-1.5 font-semibold">
                    <span className={change >= 0 ? 'text-up' : 'text-down'}>{change>0?'+':''}{formatPrice(change, symbolCode)}</span>
                    <span className={change >= 0 ? 'text-up' : 'text-down'}>{change>0?'+':''}{changePercent.toFixed(2)}%</span>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-gray-400 dark:text-textSub text-right font-mono">
                <div>高 <span className="text-gray-900 dark:text-textMain font-bold text-sm">{formatPrice(currentBar.high, symbolCode)}</span></div>
                <div>开 <span className="text-gray-900 dark:text-textMain font-bold text-sm">{formatPrice(currentBar.open, symbolCode)}</span></div>
                <div>低 <span className="text-gray-900 dark:text-textMain font-bold text-sm">{formatPrice(currentBar.low, symbolCode)}</span></div>
                <div>量 <span className="text-yellow-600 dark:text-yellow-500 font-bold text-sm">{currentBar.volume}</span></div>
            </div>
          </div>

          {/* 3. Timeframe Tabs */}
          <div className="flex bg-gray-50 dark:bg-app border-b border-gray-200 dark:border-border shrink-0 overflow-x-auto no-scrollbar z-10">
            {TIMEFRAMES.map(tf => (
                <div key={tf.value} 
                     onClick={() => handleTimeframeChange(tf.value)}
                     className={`px-4 py-2.5 text-sm whitespace-nowrap cursor-pointer transition-colors font-medium ${
                         timeframe === tf.value 
                         ? 'text-accent border-b-2 border-accent' 
                         : 'text-gray-500 dark:text-textSub'
                     }`}>
                    {tf.label}
                </div>
            ))}
            <div className="ml-auto px-4 py-2.5 text-gray-400 dark:text-textSub active:text-accent" onClick={() => setActiveSheet('settings')}>
                <SettingsIcon />
            </div>
          </div>
      </div>

      {/* Landscape Header (Visible only in Landscape) */}
      <div className="hidden landscape:flex items-center justify-between px-4 h-10 bg-white dark:bg-panel border-b border-gray-200 dark:border-border shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div onClick={goHome} className="cursor-pointer text-gray-500 dark:text-textSub hover:text-gray-900 dark:hover:text-white"><BackIcon /></div>
            <div className="font-bold text-sm">{symbol.name} <span className="text-xs font-mono text-gray-400">{symbolCode.toUpperCase()}</span></div>
            <div className={`font-mono font-bold text-sm ${change >= 0 ? 'text-up' : 'text-down'}`}>
                {formatPrice(lastPrice, symbolCode)} <span className="text-xs ml-1">({changePercent.toFixed(2)}%)</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex gap-2">
                 {TIMEFRAMES.map(tf => (
                     <div key={tf.value} onClick={() => handleTimeframeChange(tf.value)} 
                          className={`text-xs cursor-pointer px-2 py-1 rounded transition-colors ${timeframe === tf.value ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-900 dark:text-textSub dark:hover:text-white'}`}>
                        {tf.label}
                     </div>
                 ))}
             </div>
             <div onClick={() => setActiveSheet('settings')} className="cursor-pointer text-gray-500 dark:text-textSub hover:text-gray-900 dark:hover:text-white"><SettingsIcon /></div>
          </div>
      </div>

      {/* 4. Chart & Indicator */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-white dark:bg-app">
        <ChartBoard 
            data={displayData} 
            symbolCode={symbolCode} 
            markers={markers} 
            lastPrice={lastPrice} 
            showOrderBook={showOrderBook}
            isLineChart={isLineChart}
            onToggleOrderBook={() => setShowOrderBook(!showOrderBook)}
            theme={theme}
            position={position}
            drawings={drawings}
            onUpdateDrawings={setDrawings}
            drawMode={drawMode}
            comparisonData={comparisonData}
            showMeasure={showMeasure}
            measureType={measureType}
            crosshairMode={crosshairMode}
            showMA={showMA}
        />
        <div className="shrink-0 border-t border-gray-200 dark:border-border z-0">
            <IndicatorPane 
                data={displayData} 
                height={100} 
                theme={theme} 
                indicatorType={indicatorType}
                setIndicatorType={setIndicatorType}
            />
        </div>
        
        {/* Draw Mode Indicator */}
        {(drawMode || showMeasure) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-30 animate-pop">
                {drawMode === 'line' ? '画线模式 (点击图表)' : showMeasure ? `${measureType==='range'?'区间':'两点'}测量 (点击)` : ''}
                <button className="ml-2 text-white/80" onClick={() => { setDrawMode(null); setShowMeasure(false); }}>✕</button>
            </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="bg-white dark:bg-app px-4 pb-2 pt-1 border-t border-gray-100 dark:border-gray-800 z-30">
        <input 
            type="range" 
            min="0" 
            max={fullData.length - 1} 
            value={currentIndex} 
            onChange={handleProgressChange}
            className="w-full"
        />
      </div>

      {/* 5. Bottom Action Bar */}
      <div className="h-[64px] landscape:h-[48px] bg-white/95 dark:bg-panel/95 backdrop-blur-md border-t border-gray-200 dark:border-border flex items-center justify-between px-4 pb-safe safe-bottom shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative">
        <div className="flex items-center gap-3">
             <button onClick={() => setIsPlaying(!isPlaying)} className={`w-11 h-11 landscape:w-8 landscape:h-8 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
                 isPlaying 
                 ? 'bg-accent text-white' 
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
             }`}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
             </button>
             <button onClick={() => setActiveSheet('speed')} className="flex flex-col text-[10px] font-mono text-gray-500 dark:text-textSub items-start">
                <span className="scale-90 origin-left">倍速</span>
                <span className="font-bold text-gray-900 dark:text-white text-xs">{speed===1000?'1.0x':speed===500?'2.0x':speed===200?'5.0x':'20x'}</span>
             </button>
        </div>

        <div className="flex gap-5">
             <button onClick={() => setActiveSheet('position')} className="flex flex-col items-center text-gray-400 dark:text-textSub hover:text-gray-900 dark:hover:text-white relative transition-colors">
                <WalletIcon />
                <span className="text-[10px] mt-1 font-medium landscape:hidden">持仓</span>
                {position && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white dark:border-panel"></span>}
             </button>
             
             <button onClick={() => setActiveSheet('trade')} className="bg-up text-white px-8 landscape:px-4 py-2.5 landscape:py-1.5 rounded-full font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-transform">
                交易
             </button>

             <button onClick={() => setActiveSheet('more')} className="flex flex-col items-center text-gray-400 dark:text-textSub hover:text-gray-900 dark:hover:text-white transition-colors">
                <MenuIcon />
                <span className="text-[10px] mt-1 font-medium landscape:hidden">更多</span>
             </button>
        </div>
      </div>

      {/* Sheets Config ... (Same as before, simplified for brevity in this output, but needs to be included in real update) */}
      {/* Speed Sheet */}
      {activeSheet === 'speed' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveSheet('none')} />
            <div className="absolute bottom-[70px] left-16 bg-white dark:bg-panel border border-gray-200 dark:border-border rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 w-24 animate-pop">
                {[1000, 500, 200, 50].map(s => (
                    <button key={s} onClick={() => { setSpeed(s); setActiveSheet('none'); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold ${speed===s ? 'bg-accent text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {s===1000?'1.0x':s===500?'2.0x':s===200?'5.0x':'20x'}
                    </button>
                ))}
            </div>
          </>
      )}

      {/* More Sheet, Measure Config, Alerts, Overlay, Trade, Position, Settings are identical to previous version, assume they are retained in full update */}
      
      {activeSheet === 'more' && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-50 animate-slide-up pb-safe safe-bottom border-t border-gray-200 dark:border-border shadow-2xl">
                 <div className="p-5">
                    <div className="flex justify-between items-center mb-6">
                         <span className="font-bold text-lg">更多功能</span>
                         <div onClick={() => setActiveSheet('none')} className="text-gray-400 cursor-pointer p-1 bg-gray-100 dark:bg-gray-700 rounded-full"><CloseIcon /></div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="col-span-4 text-xs font-bold text-gray-500 mb-1">画线工具</div>
                        <button onClick={() => { setDrawMode('line'); setActiveSheet('none'); }} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl active:bg-gray-200 dark:active:bg-gray-700">
                            <PencilIcon />
                            <span className="text-xs">画线</span>
                        </button>
                        <button onClick={() => { setActiveSheet('measureConfig'); }} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl active:bg-gray-200 dark:active:bg-gray-700">
                            <MeasureIcon />
                            <span className="text-xs">测量</span>
                        </button>
                        <button onClick={clearDrawings} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl active:bg-gray-200 dark:active:bg-gray-700 text-red-500">
                            <TrashIcon />
                            <span className="text-xs">清除未锁</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 border-t border-gray-200 dark:border-border pt-4">
                        <div className="col-span-4 text-xs font-bold text-gray-500 mb-1">高级功能</div>
                        <button onClick={() => setActiveSheet('alerts')} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl active:bg-gray-200 dark:active:bg-gray-700">
                            <AlertIcon />
                            <span className="text-xs">预警</span>
                        </button>
                        <button onClick={() => setActiveSheet('overlay')} className={`flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-200 dark:active:bg-gray-700 ${comparisonData.length>0 ? 'bg-accent text-white' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <CheckIcon />
                            <span className="text-xs">对比叠加</span>
                        </button>
                    </div>
                 </div>
            </div>
          </>
      )}

      {activeSheet === 'measureConfig' && (
           <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-50 animate-slide-up pb-safe safe-bottom p-5 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <span className="font-bold text-lg flex items-center gap-2"><MeasureIcon /> 测量设置</span>
                     <div onClick={() => setActiveSheet('more')} className="text-blue-500 text-sm font-bold cursor-pointer">返回</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                     <button onClick={() => { setMeasureType('range'); startMeasure(); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${measureType==='range'?'border-accent bg-accent/10':'border-gray-200 dark:border-gray-700'}`}>
                         <MeasureIcon />
                         <span className="font-bold text-sm">区间测量</span>
                         <span className="text-[10px] text-gray-500">统计范围K线数据</span>
                     </button>
                     <button onClick={() => { setMeasureType('vector'); startMeasure(); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${measureType==='vector'?'border-accent bg-accent/10':'border-gray-200 dark:border-gray-700'}`}>
                         <VectorIcon />
                         <span className="font-bold text-sm">两点测量</span>
                         <span className="text-[10px] text-gray-500">点对点连接</span>
                     </button>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                     <div className="flex items-center gap-2">
                         <MagnetIcon />
                         <span className="text-sm font-bold">磁吸模式</span>
                     </div>
                     <div onClick={() => setCrosshairMode(m => m === 'free' ? 'magnet' : 'free')} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${crosshairMode==='magnet'?'bg-accent':'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${crosshairMode==='magnet'?'translate-x-6':'translate-x-0'}`}></div>
                     </div>
                </div>
            </div>
           </>
      )}

      {activeSheet === 'alerts' && (
           <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-50 animate-slide-up pb-safe safe-bottom p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                     <span className="font-bold text-lg flex items-center gap-2"><AlertIcon /> 价格预警</span>
                     <div onClick={() => setActiveSheet('more')} className="text-blue-500 text-sm font-bold cursor-pointer">返回</div>
                </div>
                <div className="flex gap-2 mb-4">
                    <input type="number" placeholder="输入预警价格" value={alertInput} onChange={e => setAlertInput(e.target.value)} className="flex-1 bg-gray-100 dark:bg-app border border-gray-200 dark:border-border rounded-xl px-4 py-3 outline-none font-mono" />
                    <button onClick={addAlert} className="bg-accent text-white font-bold px-6 rounded-xl">添加</button>
                </div>
                {alerts.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                        {alerts.map(a => (
                            <div key={a.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs">
                                <span className={`font-mono ${a.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 decoration-line-through'}`}>{a.price}</span>
                                <button onClick={() => setAlerts(alerts.filter(al => al.id !== a.id))} className="text-red-500">删除</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </>
      )}

      {activeSheet === 'overlay' && (
           <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-50 animate-slide-up pb-safe safe-bottom p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                     <span className="font-bold text-lg flex items-center gap-2"><CheckIcon /> 选择叠加标的</span>
                     <div onClick={() => setActiveSheet('more')} className="text-blue-500 text-sm font-bold cursor-pointer">返回</div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    <div onClick={() => { setComparisonData([]); setOverlaySymbol(null); setActiveSheet('none'); }} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-red-500 font-bold mb-2 cursor-pointer">清除叠加</div>
                    {SYMBOLS.filter(s => s.code !== symbolCode).map(s => (
                        <div key={s.code} onClick={() => handleOverlaySelect(s.code)} className="p-3 border border-gray-200 dark:border-border rounded-xl flex justify-between items-center active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer">
                            <span className="font-bold">{s.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{s.code.toUpperCase()}</span>
                        </div>
                    ))}
                </div>
            </div>
          </>
      )}
      
      {activeSheet === 'trade' && (
        <>
            <div className="fixed inset-0 z-30" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-[64px] left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-40 animate-slide-up border-t border-gray-200 dark:border-border shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 dark:border-border">
                    <span className="font-bold text-base">下单交易</span>
                    <div onClick={() => setActiveSheet('none')} className="text-gray-400 cursor-pointer p-1 bg-gray-100 dark:bg-gray-700 rounded-full"><CloseIcon /></div>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-textSub">数量 (手)</span>
                        <div className="flex items-center bg-gray-100 dark:bg-app rounded-xl border border-gray-200 dark:border-border overflow-hidden">
                            <button onClick={() => setQty(Math.max(1, qty-1))} className="w-10 h-8 text-lg font-light hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">-</button>
                            <input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-16 bg-transparent text-center font-mono font-bold outline-none text-sm" />
                            <button onClick={() => setQty(qty+1)} className="w-10 h-8 text-lg font-light hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">+</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => executeTrade(1)} className="bg-up py-3 rounded-xl font-bold text-white flex flex-col items-center shadow-lg shadow-red-500/10 active:scale-[0.98] transition-all">
                            <span className="text-sm">买入 / 做多</span>
                            <span className="text-[10px] opacity-80 font-mono mt-0.5">{formatPrice(lastPrice, symbolCode)}</span>
                        </button>
                        <button onClick={() => executeTrade(-1)} className="bg-down py-3 rounded-xl font-bold text-white flex flex-col items-center shadow-lg shadow-green-500/10 active:scale-[0.98] transition-all">
                            <span className="text-sm">卖出 / 做空</span>
                            <span className="text-[10px] opacity-80 font-mono mt-0.5">{formatPrice(lastPrice, symbolCode)}</span>
                        </button>
                    </div>

                    <div className="text-center text-[10px] text-gray-400 dark:text-textSub">
                        可用: <span className="text-gray-900 dark:text-textMain font-mono font-bold ml-1">{formatMoney(balance)}</span>
                        <span className="mx-2">|</span>
                        保证金: <span className="text-gray-900 dark:text-textMain font-mono font-bold ml-1">{(symbol.marginRate * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </>
      )}

      {activeSheet === 'position' && (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setActiveSheet('none')} />
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-panel rounded-t-3xl z-50 animate-slide-up pb-safe safe-bottom border-t border-gray-200 dark:border-border max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-border shrink-0">
                    <span className="font-bold text-lg">我的持仓 & 资产</span>
                    <div onClick={() => setActiveSheet('none')} className="text-gray-400 cursor-pointer p-1 bg-gray-100 dark:bg-gray-700 rounded-full"><CloseIcon /></div>
                </div>
                
                <div className="p-5 overflow-y-auto">
                    <div className="bg-gradient-to-br from-gray-800 to-black dark:from-[#252526] dark:to-[#151517] text-white rounded-2xl p-5 mb-6 shadow-lg">
                        <div className="text-xs text-gray-400">动态权益 (Total Equity)</div>
                        <div className="text-3xl font-mono font-bold my-2">{formatMoney(equity)}</div>
                        <div className="flex justify-between text-xs mt-3 pt-3 border-t border-white/10">
                             <span>浮动盈亏: <span className={pnl >= 0 ? 'text-up' : 'text-down'}>{pnl>0?'+':''}{Math.floor(pnl)}</span></span>
                             <span>总交易数: {trades.length}</span>
                        </div>
                    </div>

                    <div className="mb-3 text-sm font-bold text-gray-500 dark:text-textSub ml-1">当前持仓</div>
                    {!position ? (
                        <div className="p-8 text-center text-gray-400 border border-dashed border-gray-300 dark:border-border rounded-xl bg-gray-50 dark:bg-app/50">暂无持仓</div>
                    ) : (
                        <div className="bg-white dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-border p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">{symbol.name}</span>
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${position.qty>0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>{position.qty>0 ? '多单 LONG' : '空单 SHORT'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-gray-500 dark:text-textSub font-mono">
                                <div>开仓均价: <span className="text-gray-900 dark:text-textMain float-right">{formatPrice(position.entryPrice, symbolCode)}</span></div>
                                <div>当前价格: <span className="text-gray-900 dark:text-textMain float-right">{formatPrice(lastPrice, symbolCode)}</span></div>
                                <div>持仓手数: <span className="text-gray-900 dark:text-textMain float-right">{Math.abs(position.qty)}</span></div>
                                <div>持仓盈亏: <span className={`text-sm font-bold float-right ${pnl>=0?'text-up':'text-down'}`}>{pnl>0?'+':''}{Math.floor(pnl)}</span></div>
                            </div>
                            <button onClick={closePosition} className="w-full mt-5 py-3 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-bold rounded-xl text-sm transition-colors shadow-md">市价平仓</button>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-8 mb-3 ml-1">
                        <span className="text-sm font-bold text-gray-500 dark:text-textSub">最近成交</span>
                        <span onClick={() => { setActiveSheet('none'); setView('history'); }} className="text-xs text-accent font-bold cursor-pointer">查看全部 &gt;</span>
                    </div>
                    <div className="space-y-2.5">
                        {trades.length === 0 && <div className="text-center text-xs text-gray-400 py-4">无交易记录</div>}
                        {trades.slice().reverse().slice(0, 5).map((t, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-3 bg-white dark:bg-app rounded-xl border border-gray-200 dark:border-border shadow-sm">
                                <span className="font-mono text-gray-400 dark:text-textSub">{new Date(t.time * 1000).toLocaleTimeString()}</span>
                                <span className={`font-bold ${t.dir === 1 ? 'text-up' : 'text-down'}`}>{t.action === 'Open' ? '开仓' : '平仓'} {t.dir === 1 ? '买入' : '卖出'}</span>
                                <span className="font-mono text-gray-900 dark:text-textMain">@{formatPrice(t.price, symbolCode)}</span>
                                <span className={`font-mono font-bold ${t.pnl && t.pnl > 0 ? 'text-up' : (t.pnl && t.pnl < 0 ? 'text-down' : 'text-gray-400')}`}>{t.pnl ? Math.floor(t.pnl) : '-'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
      )}

      {(activeSheet === 'settings' || showResult) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            {showResult && equity < 100000 && (
                <div className="rain-container">
                    {[...Array(20)].map((_, i) => <div key={i} className="drop" style={{left: Math.random()*100+'%', animationDelay: Math.random()+'s', animationDuration: 0.5+Math.random()+'s'}}></div>)}
                </div>
            )}
            <div className="bg-white dark:bg-panel border border-gray-200 dark:border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl transform scale-100 transition-all z-50">
                <div className="p-4 border-b border-gray-200 dark:border-border font-bold text-center text-gray-900 dark:text-white">{showResult ? '复盘结算' : '系统设置'}</div>
                <div className="p-6 text-center">
                    {showResult ? (
                        <>
                            {(() => { if(equity > 100000) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); return null; })()}
                            <div className="text-gray-500 text-sm mb-1">最终权益</div>
                            <div className={`text-4xl font-mono mb-4 font-bold ${equity >= 100000 ? 'text-up' : 'text-down'}`}>{formatMoney(equity)}</div>
                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                                    <div className="text-gray-500">收益率</div>
                                    <div className="font-bold font-mono">{((equity-100000)/100000*100).toFixed(2)}%</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                                    <div className="text-gray-500">交易次数</div>
                                    <div className="font-bold font-mono">{trades.length}</div>
                                </div>
                            </div>
                            <button onClick={enterReplay.bind(null, symbolCode)} className="w-full py-3.5 bg-accent text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98]">再来一局</button>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-app rounded-xl mb-4">
                                <span className="text-sm">暗黑模式</span>
                                <div onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${theme==='dark'?'bg-accent':'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${theme==='dark'?'translate-x-6':'translate-x-0'}`}></div>
                                </div>
                            </div>
                             <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-app rounded-xl mb-4">
                                <span className="text-sm">显示均线标签</span>
                                <div onClick={() => setShowMA(!showMA)} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${showMA?'bg-accent':'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${showMA?'translate-x-6':'translate-x-0'}`}></div>
                                </div>
                            </div>
                            <button onClick={() => { setActiveSheet('none'); setIsPlaying(true); }} className="w-full py-3.5 bg-gray-900 dark:bg-gray-700 text-white font-bold rounded-xl active:scale-[0.98]">继续复盘</button>
                            <button onClick={() => enterReplay(symbolCode)} className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-bold rounded-xl active:scale-[0.98]">重新开始</button>
                            <button onClick={goHome} className="w-full py-3.5 text-red-500 font-bold active:bg-red-50 rounded-xl">退出回到首页</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
