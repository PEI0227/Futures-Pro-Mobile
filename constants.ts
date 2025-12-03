import { SymbolConfig } from './types';

export const SYMBOLS: SymbolConfig[] = [
  { code: 'rb2501', name: '螺纹钢2501', basePrice: 3300, volatility: 0.008, multiplier: 10, marginRate: 0.1 },
  { code: 'ag2512', name: '沪银2512', basePrice: 7100, volatility: 0.012, multiplier: 15, marginRate: 0.12 },
  { code: 'au2512', name: '沪金2512', basePrice: 600, volatility: 0.006, multiplier: 1000, marginRate: 0.08 },
  { code: 'sc2501', name: '原油2501', basePrice: 530, volatility: 0.020, multiplier: 1000, marginRate: 0.15 },
  { code: 'lh2501', name: '生猪2501', basePrice: 14500, volatility: 0.015, multiplier: 16, marginRate: 0.1 },
  { code: 'IF2501', name: '沪深300', basePrice: 3400, volatility: 0.018, multiplier: 300, marginRate: 0.12 },
  { code: 'eth_usdt', name: '以太永续', basePrice: 2800, volatility: 0.025, multiplier: 1, marginRate: 0.01 }, // Crypto has low margin
];

export const TIMEFRAMES = [
  { label: '分时', value: '1m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '30分', value: '30m' },
  { label: '日线', value: '1D' },
];

export const formatMoney = (val: number) => Math.floor(val).toLocaleString();
export const formatPrice = (val: number, symbol: string) => {
    const decimals = symbol.includes('au') || symbol.includes('sc') ? 2 : 0;
    return val.toFixed(decimals);
};

// Helper to generate Order Book fake data based on current price
export const generateOrderBook = (price: number, volatility: number) => {
  const spread = price * 0.0002;
  const asks = [];
  const bids = [];
  for (let i = 1; i <= 5; i++) {
    asks.push({ 
        price: price + i * spread + (Math.random() * spread * 0.5), 
        vol: Math.floor(Math.random() * 50 + 1) 
    });
    bids.push({ 
        price: price - i * spread - (Math.random() * spread * 0.5), 
        vol: Math.floor(Math.random() * 50 + 1) 
    });
  }
  return { asks: asks.reverse(), bids };
};