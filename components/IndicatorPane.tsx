
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, ISeriesApi, Time, HistogramSeries, LineSeries } from 'lightweight-charts';
import { BarData, IndicatorType } from '../types';
import { calculateMACD, calculateRSI } from '../utils/indicators';

interface Props {
    data: BarData[];
    height: number;
    theme: 'light' | 'dark';
    indicatorType: IndicatorType;
    setIndicatorType: (t: IndicatorType) => void;
}

const IndicatorPane: React.FC<Props> = ({ data, height, theme, indicatorType, setIndicatorType }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRefs = useRef<any[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        const isDark = theme === 'dark';
        const bgColor = isDark ? '#000000' : '#ffffff';
        const gridColor = isDark ? '#1c1c1e' : '#f2f2f7';
        const borderColor = isDark ? '#2c2c2e' : '#e5e5ea';
        const textColor = isDark ? '#8e8e93' : '#8e8e93';

        const chart = createChart(containerRef.current, {
            layout: { background: { type: ColorType.Solid, color: bgColor }, textColor },
            grid: { vertLines: { visible: false }, horzLines: { color: gridColor } },
            width: containerRef.current.clientWidth,
            height: height,
            timeScale: { visible: true, timeVisible: true, borderVisible: true, borderColor },
            rightPriceScale: { 
                scaleMargins: { top: 0.1, bottom: 0.1 },
                borderVisible: false 
            },
            handleScale: { axisPressedMouseMove: { time: true, price: false } },
        });

        chartRef.current = chart;
        
        const handleResize = () => {
            if (containerRef.current) {
                chart.applyOptions({ width: containerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            seriesRefs.current = [];
        };
    }, [height, theme]); 

    // Update Series
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;
        
        seriesRefs.current.forEach(s => chart.removeSeries(s));
        seriesRefs.current = [];

        if (indicatorType === IndicatorType.VOL) {
            const volSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: 'right',
            });
            const volData = data.map(d => ({
                time: d.time as Time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(255, 59, 48, 0.5)' : 'rgba(52, 199, 89, 0.5)',
            }));
            volSeries.setData(volData);
            seriesRefs.current.push(volSeries);
        } 
        else if (indicatorType === IndicatorType.RSI) {
            const rsiData = calculateRSI(data);
            const rsiSeries = chart.addSeries(LineSeries, {
                color: '#bf5af2',
                lineWidth: 1,
                priceScaleId: 'right',
            });
            rsiSeries.createPriceLine({ price: 70, color: '#8e8e93', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
            rsiSeries.createPriceLine({ price: 30, color: '#8e8e93', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
            
            rsiSeries.setData(rsiData.filter(d => !isNaN(d.value)).map(d => ({ time: d.time as Time, value: d.value })));
            seriesRefs.current.push(rsiSeries);
        }
        else if (indicatorType === IndicatorType.MACD) {
            const macdData = calculateMACD(data);
            
            const histSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
            const macdSeries = chart.addSeries(LineSeries, { color: '#0a84ff', lineWidth: 1, priceScaleId: 'right' });
            const signalSeries = chart.addSeries(LineSeries, { color: '#ff9f0a', lineWidth: 1, priceScaleId: 'right' });

            histSeries.setData(macdData.map(d => ({
                time: d.time as Time,
                value: d.histogram,
                color: d.histogram >= 0 ? 'rgba(255, 59, 48, 0.5)' : 'rgba(52, 199, 89, 0.5)'
            })));
            macdSeries.setData(macdData.map(d => ({ time: d.time as Time, value: d.macd })));
            signalSeries.setData(macdData.map(d => ({ time: d.time as Time, value: d.signal })));

            seriesRefs.current.push(histSeries, macdSeries, signalSeries);
        }

    }, [data, indicatorType]);

    return (
        <div className={`relative border-b w-full ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`} style={{ marginBottom: 4 }}>
             <div className="absolute top-1 left-2 z-20 flex gap-2">
                 {[IndicatorType.VOL, IndicatorType.MACD, IndicatorType.RSI].map(t => (
                     <button 
                        key={t}
                        onClick={() => setIndicatorType(t)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            indicatorType === t 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                     >
                        {t}
                     </button>
                 ))}
             </div>
             <div ref={containerRef} style={{ height }} />
        </div>
    );
}

export default IndicatorPane;
