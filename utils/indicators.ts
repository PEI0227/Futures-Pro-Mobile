
import { BarData } from '../types';

export const calculateRSI = (data: BarData[], period: number = 14) => {
    const rsiData = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < data.length; i++) {
        const time = data[i].time;
        if (i === 0) {
            rsiData.push({ time, value: NaN });
            continue;
        }

        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        if (i < period + 1) {
            gains += gain;
            losses += loss;
            rsiData.push({ time, value: NaN });
        } else if (i === period + 1) {
            let avgGain = gains / period;
            let avgLoss = losses / period;
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsiData.push({ time, value: rsi });
        } else {
            // Smoothed
            // Previous averages are needed, but for simplicity in this stateless loop we re-approximate or need state.
            // Standard RMA (Wilder's)
            // To do it accurately without storing state, we need to iterate sequentially properly.
        }
    }
    
    // Simple iterative recalculation for correctness
    const result = [];
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 0; i < data.length; i++) {
        const time = data[i].time;
        if (i === 0) {
            result.push({ time, value: NaN });
            continue;
        }
        const change = data[i].close - data[i-1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        if (i < period) {
            avgGain += gain;
            avgLoss += loss;
            result.push({ time, value: NaN });
        } else if (i === period) {
            avgGain /= period;
            avgLoss /= period;
            const rs = avgGain / avgLoss;
            result.push({ time, value: 100 - (100 / (1 + rs)) });
        } else {
            avgGain = ((avgGain * (period - 1)) + gain) / period;
            avgLoss = ((avgLoss * (period - 1)) + loss) / period;
            const rs = avgGain / (avgLoss === 0 ? 0.0001 : avgLoss); // avoid div 0
            result.push({ time, value: 100 - (100 / (1 + rs)) });
        }
    }
    return result;
};

export const calculateMACD = (data: BarData[], fast: number = 12, slow: number = 26, signal: number = 9) => {
    // EMA helper
    const calculateEMA = (values: number[], days: number) => {
        const k = 2 / (days + 1);
        const emaArr = [values[0]];
        for (let i = 1; i < values.length; i++) {
            emaArr.push(values[i] * k + emaArr[i - 1] * (1 - k));
        }
        return emaArr;
    };

    const closes = data.map(d => d.close);
    const emaFast = calculateEMA(closes, fast);
    const emaSlow = calculateEMA(closes, slow);
    
    const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
    const signalLine = calculateEMA(macdLine, signal);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);

    return data.map((d, i) => ({
        time: d.time,
        macd: macdLine[i],
        signal: signalLine[i],
        histogram: histogram[i]
    }));
};
