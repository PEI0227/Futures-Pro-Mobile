
import { SymbolConfig } from './types';

export const SYMBOLS: SymbolConfig[] = [
  // --- Hot Symbols ---
  { code: 'rb2501', name: '螺纹钢2501', basePrice: 3300, volatility: 0.008, multiplier: 10, marginRate: 0.1, isHot: true },
  { code: 'ag2512', name: '沪银2512', basePrice: 7100, volatility: 0.012, multiplier: 15, marginRate: 0.12, isHot: true },
  { code: 'eth_usdt', name: '以太永续', basePrice: 2800, volatility: 0.025, multiplier: 1, marginRate: 0.02, isHot: true },
  { code: 'sc2501', name: '原油2501', basePrice: 530, volatility: 0.020, multiplier: 1000, marginRate: 0.15, isHot: true },
  { code: 'IF2501', name: '沪深300', basePrice: 3900, volatility: 0.015, multiplier: 300, marginRate: 0.12, isHot: true },

  // --- Metals ---
  { code: 'au2512', name: '沪金2512', basePrice: 600, volatility: 0.006, multiplier: 1000, marginRate: 0.08 },
  { code: 'cu2501', name: '沪铜2501', basePrice: 68000, volatility: 0.008, multiplier: 5, marginRate: 0.1 },
  { code: 'al2501', name: '沪铝2501', basePrice: 19500, volatility: 0.007, multiplier: 5, marginRate: 0.1 },
  { code: 'zn2501', name: '沪锌2501', basePrice: 21000, volatility: 0.009, multiplier: 5, marginRate: 0.1 },

  // --- Energy & Chemicals ---
  { code: 'fu2501', name: '燃油2501', basePrice: 3000, volatility: 0.015, multiplier: 10, marginRate: 0.15 },
  { code: 'pg2501', name: '液化气2501', basePrice: 4800, volatility: 0.018, multiplier: 20, marginRate: 0.15 },
  { code: 'p2501',  name: '棕榈油2501', basePrice: 7500, volatility: 0.012, multiplier: 10, marginRate: 0.1 },
  { code: 'm2501',  name: '豆粕2501', basePrice: 3100, volatility: 0.008, multiplier: 10, marginRate: 0.08 },
  { code: 'y2501',  name: '豆油2501', basePrice: 8200, volatility: 0.010, multiplier: 10, marginRate: 0.08 },

  // --- Others ---
  { code: 'lh2501', name: '生猪2501', basePrice: 14500, volatility: 0.015, multiplier: 16, marginRate: 0.1 },
  { code: 'jd2501', name: '鸡蛋2501', basePrice: 3600, volatility: 0.010, multiplier: 10, marginRate: 0.09 },
  { code: 'FG2501', name: '玻璃2501', basePrice: 1600, volatility: 0.020, multiplier: 20, marginRate: 0.15 },
  { code: 'SA2501', name: '纯碱2501', basePrice: 1800, volatility: 0.025, multiplier: 20, marginRate: 0.15 },
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
    // Determine decimal places based on price magnitude or specific symbols
    const s = SYMBOLS.find(x => x.code === symbol);
    if (s && s.basePrice < 10) return val.toFixed(4);
    if (s && s.basePrice < 1000) return val.toFixed(2);
    return val.toFixed(0);
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
