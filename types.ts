
export interface BarData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolConfig {
  code: string;
  name: string;
  basePrice: number;
  volatility: number;
  multiplier: number;
  marginRate: number; // e.g., 0.1 for 10%
  isHot?: boolean;
}

export enum OrderType {
  MARKET = 'Market',
  LIMIT = 'Limit',
  STOP = 'Stop'
}

export enum IndicatorType {
  VOL = 'VOL',
  MACD = 'MACD',
  RSI = 'RSI'
}

export interface Position {
  symbol: string;
  qty: number; // + for long, - for short
  entryPrice: number;
}

export interface PendingOrder {
  id: number;
  type: OrderType;
  dir: 1 | -1; // 1 Buy, -1 Sell
  qty: number;
  price: number;
  status: 'Pending' | 'Filled' | 'Cancelled';
}

export interface MarketSnapshot {
  price: number;
  high: number;
  low: number;
  open: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface TradeRecord {
  id?: number;
  time: number;
  price: number;
  qty: number;
  dir: 1 | -1;
  action: 'Open' | 'Close';
  pnl?: number;
}

export interface Drawing {
    id: number;
    type: 'line' | 'ray'; 
    points: { time: number, price: number }[];
    color: string;
    locked: boolean;
    lineWidth?: number; // Added
}

export interface Alert {
    id: number;
    price: number;
    active: boolean;
}

export interface ToastMsg {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type CrosshairMode = 'free' | 'magnet';
export type MeasureType = 'range' | 'vector';
