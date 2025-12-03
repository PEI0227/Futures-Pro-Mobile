import { BarData, SymbolConfig } from '../types';

export const generateHistory = (symbol: SymbolConfig, bars: number, timeframeMin: number): BarData[] => {
  let price = symbol.basePrice;
  const data: BarData[] = [];
  let currentTime = Math.floor(Date.now() / 1000) - (bars * timeframeMin * 60);

  // Random Walk Parameters
  // Drift can be slightly positive or negative for the session
  const drift = (Math.random() - 0.5) * 0.0001; 

  for (let i = 0; i < bars; i++) {
    const vol = symbol.volatility * Math.sqrt(timeframeMin / 1440); // Scale daily volatility
    const randomShock = (Math.random() - 0.5) * 2; // -1 to 1 normal-ish
    
    const changePercent = drift + (vol * randomShock);
    const close = price * (1 + changePercent);
    
    // Intra-bar high/low logic
    const body = Math.abs(close - price);
    const wickVol = vol * price * 0.5;
    const high = Math.max(price, close) + Math.random() * wickVol;
    const low = Math.min(price, close) - Math.random() * wickVol;
    
    const volume = Math.floor(Math.random() * 1000 + (body / price) * 1000000);

    data.push({
      time: currentTime,
      open: price,
      high,
      low,
      close,
      volume: Math.abs(volume)
    });

    price = close;
    currentTime += timeframeMin * 60;
  }
  return data;
};