
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, Time, CandlestickSeries, LineSeries, AreaSeries, LineStyle } from 'lightweight-charts';
import { BarData, Drawing, Position, CrosshairMode as CHMode, MeasureType } from '../types';
import { generateOrderBook, formatPrice } from '../constants';
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from './Icons';

interface Props {
  data: BarData[];
  symbolCode: string;
  markers: any[];
  lastPrice: number;
  showOrderBook: boolean;
  isLineChart: boolean;
  onToggleOrderBook: () => void;
  theme: 'light' | 'dark';
  position: Position | null;
  drawings: Drawing[];
  onUpdateDrawings: (drawings: Drawing[]) => void;
  drawMode: 'line' | 'ray' | null;
  comparisonData: BarData[]; 
  showMeasure: boolean;
  measureType: MeasureType;
  crosshairMode: CHMode;
  showMA: boolean;
}

const ChartBoard: React.FC<Props> = ({ 
    data, symbolCode, markers, lastPrice, showOrderBook, isLineChart, onToggleOrderBook, theme,
    position, drawings, onUpdateDrawings, drawMode, comparisonData, showMeasure, measureType, crosshairMode, showMA
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Area'> | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma5Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ma10Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const posLineRef = useRef<any>(null); 
  
  // Overlay Lines State (For Drawings)
  const [overlayLines, setOverlayLines] = useState<any[]>([]);
  
  // Crosshair & Measure State
  const [orderBook, setOrderBook] = useState<{asks: any[], bids: any[]}>({ asks: [], bids: [] });
  const [crosshair, setCrosshair] = useState<{ x: number, y: number, time: number, price: number, index: number } | null>(null);
  const [measureStart, setMeasureStart] = useState<{ time: number, price: number, index: number } | null>(null);

  // Editing State
  const [editingDrawingId, setEditingDrawingId] = useState<number | null>(null);

  // Refs
  const drawModeRef = useRef(drawMode);
  const drawingsRef = useRef(drawings);
  const showMeasureRef = useRef(showMeasure);
  const measureStartRef = useRef(measureStart);
  const measureTypeRef = useRef(measureType);
  const crosshairModeRef = useRef(crosshairMode);
  const dataRef = useRef(data);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  useEffect(() => { showMeasureRef.current = showMeasure; }, [showMeasure]);
  useEffect(() => { measureStartRef.current = measureStart; }, [measureStart]);
  useEffect(() => { measureTypeRef.current = measureType; }, [measureType]);
  useEffect(() => { crosshairModeRef.current = crosshairMode; }, [crosshairMode]);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Snap Logic Helper
  const getSnappedPrice = (time: number, defaultPrice: number): number => {
      const dataArr = dataRef.current;
      const bar = dataArr.find(b => b.time === time);
      if (!bar) return defaultPrice;
      
      const prices = [bar.open, bar.high, bar.low, bar.close];
      // Find closest
      return prices.reduce((prev, curr) => 
          Math.abs(curr - defaultPrice) < Math.abs(prev - defaultPrice) ? curr : prev
      );
  };

  // Toggle Chart Interactions based on Mode
  useEffect(() => {
      if (!chartRef.current) return;
      const isDrawingOrMeasuring = !!drawMode || showMeasure;
      // Disable scroll/scale when drawing to prevent map moving while clicking
      chartRef.current.applyOptions({
          handleScroll: !isDrawingOrMeasuring,
          handleScale: !isDrawingOrMeasuring,
      });
  }, [drawMode, showMeasure]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#8e8e93' : '#8e8e93';
    const gridColor = isDark ? '#1c1c1e' : '#f2f2f7';
    const borderColor = isDark ? '#2c2c2e' : '#e5e5ea';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: borderColor,
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
      },
    });

    let mainSeries;
    if (isLineChart) {
        mainSeries = chart.addSeries(AreaSeries, {
            lineColor: '#0a84ff',
            topColor: 'rgba(10, 132, 255, 0.2)',
            bottomColor: 'rgba(10, 132, 255, 0.0)',
            lineWidth: 2,
        });
    } else {
        mainSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ff3b30',
            downColor: '#34c759',
            borderVisible: false,
            wickUpColor: '#ff3b30',
            wickDownColor: '#34c759',
        });
    }

    const compareSeries = chart.addSeries(LineSeries, {
        color: '#ff9f0a',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceScaleId: 'left',
    });
    
    const ma5 = chart.addSeries(LineSeries, { color: '#ffd60a', lineWidth: 1, crosshairMarkerVisible: false });
    const ma10 = chart.addSeries(LineSeries, { color: '#bf5af2', lineWidth: 1, crosshairMarkerVisible: false });

    seriesRef.current = mainSeries as ISeriesApi<'Candlestick' | 'Area'>;
    compareSeriesRef.current = compareSeries;
    ma5Ref.current = ma5;
    ma10Ref.current = ma10;
    chartRef.current = chart;

    // Handlers
    chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData.get(mainSeries)) {
            setCrosshair(null);
            return;
        }
        let price = mainSeries.coordinateToPrice(param.point.y) || 0;
        
        // Magnet Logic
        if (crosshairModeRef.current === 'magnet') {
            const snapped = getSnappedPrice(param.time as number, price);
            price = snapped;
        }

        const logicalIdx = chart.timeScale().coordinateToLogical(param.point.x); 
        const actualIdx = logicalIdx !== null ? Math.round(logicalIdx) : -1;

        setCrosshair({ 
            x: param.point.x, 
            y: mainSeries.priceToCoordinate(price) || param.point.y, 
            time: param.time as number, 
            price: price,
            index: actualIdx
        });
    });

    chart.subscribeClick((param) => {
        if (!param.point || !param.time) return;
        const main = seriesRef.current;
        if (!main) return;
        
        let price = main.coordinateToPrice(param.point.y) || 0;
        const time = param.time as number;
        if (crosshairModeRef.current === 'magnet') {
             price = getSnappedPrice(time, price);
        }
        
        const logicalIdx = chartRef.current?.timeScale().coordinateToLogical(param.point.x) ?? 0;
        const index = Math.round(logicalIdx);

        // Measure Logic
        if (showMeasureRef.current) {
            if (!measureStartRef.current) {
                setMeasureStart({ time, price, index });
            } else {
                setMeasureStart(null); // Finish
            }
        }
        
        // Drawing Logic
        const mode = drawModeRef.current;
        if (mode) {
             const newDrawing: Drawing = {
                id: Date.now(),
                type: mode,
                points: [{ time, price }],
                color: '#0a84ff',
                locked: false,
                lineWidth: 2
            };
            onUpdateDrawings([...drawingsRef.current, newDrawing]);
        }
        
        setEditingDrawingId(null);
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isLineChart, theme]); 

  // --- Render Drawings Overlay ---
  useEffect(() => {
     if(!chartRef.current || !seriesRef.current) return;
     const chart = chartRef.current;
     const series = seriesRef.current;

     const calcLines = () => {
         const lines = drawings.map(d => {
             const p1 = d.points[0];
             const y = series.priceToCoordinate(p1.price);
             if (y === null) return null;
             return { 
                 id: d.id,
                 x1: 0, 
                 y1: y, 
                 x2: chart.timeScale().width(), 
                 y2: y, 
                 color: d.color,
                 width: d.lineWidth || 2,
                 locked: d.locked 
             };
         }).filter(Boolean);
         setOverlayLines(lines);
     };
     
     chart.timeScale().subscribeVisibleTimeRangeChange(calcLines);
     calcLines();
     return () => chart.timeScale().unsubscribeVisibleTimeRangeChange(calcLines);
  }, [drawings, data, showOrderBook]);

  // Handle Double Click for Editing
  const handleLineDoubleClick = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setEditingDrawingId(id);
  };

  const updateDrawing = (id: number, updates: Partial<Drawing>) => {
      const newDrawings = drawings.map(d => d.id === id ? { ...d, ...updates } : d);
      onUpdateDrawings(newDrawings);
  };

  // ... (MA and Overlay Effects) ...
  useEffect(() => {
      if(ma5Ref.current && ma10Ref.current) {
          ma5Ref.current.applyOptions({ visible: showMA });
          ma10Ref.current.applyOptions({ visible: showMA });
      }
  }, [showMA]);

  useEffect(() => {
      if (compareSeriesRef.current) {
          if (comparisonData.length > 0) {
              chartRef.current?.priceScale('left').applyOptions({ visible: true });
              compareSeriesRef.current.setData(comparisonData.map(d => ({ time: d.time as Time, value: d.close })));
          } else {
              chartRef.current?.priceScale('left').applyOptions({ visible: false });
              compareSeriesRef.current.setData([]);
          }
      }
  }, [comparisonData]);

  // Handle Resize
  useEffect(() => {
    if (!chartContainerRef.current || !chartRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ 
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight 
            });
        }
    });
    resizeObserver.observe(chartContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [showOrderBook]);

  // Update Data
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      if (isLineChart) {
         (seriesRef.current as ISeriesApi<'Area'>).setData(data.map(d => ({ time: d.time as Time, value: d.close })));
      } else {
         (seriesRef.current as ISeriesApi<'Candlestick'>).setData(data.map(d => ({ ...d, time: d.time as Time })));
      }
      
      const series = seriesRef.current as any;
      if (series.setMarkers) {
        series.setMarkers(markers.map(m => ({ ...m, time: m.time as Time })));
      }

      const ma5Data = data.map((d, i, arr) => {
          if(i < 4) return { time: d.time as Time, value: NaN };
          const sum = arr.slice(i-4, i+1).reduce((a,b) => a+b.close, 0);
          return { time: d.time as Time, value: sum/5 };
      }).filter(x => !isNaN(x.value));
      
      const ma10Data = data.map((d, i, arr) => {
          if(i < 9) return { time: d.time as Time, value: NaN };
          const sum = arr.slice(i-9, i+1).reduce((a,b) => a+b.close, 0);
          return { time: d.time as Time, value: sum/10 };
      }).filter(x => !isNaN(x.value));

      ma5Ref.current?.setData(ma5Data);
      ma10Ref.current?.setData(ma10Data);
    }
  }, [data, markers, isLineChart]);

  // Position Line
  useEffect(() => {
    if (seriesRef.current) {
        if (posLineRef.current) {
            seriesRef.current.removePriceLine(posLineRef.current);
            posLineRef.current = null;
        }
        if (position) {
            posLineRef.current = seriesRef.current.createPriceLine({
                price: position.entryPrice,
                color: position.qty > 0 ? '#ff3b30' : '#34c759',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: '持仓均价',
            });
        }
    }
  }, [position]);

  useEffect(() => {
    if(lastPrice > 0) {
        setOrderBook(generateOrderBook(lastPrice, 0.01));
    }
  }, [lastPrice]);

  const currentData = data[data.length - 1];
  const displayMA5 = currentData?.close?.toFixed(1) || '--';
  const displayMA10 = currentData?.open?.toFixed(1) || '--';
  const isDark = theme === 'dark';

  // Stats Logic Helper
  const getRangeStats = () => {
    if(!measureStart || !crosshair) return null;
    const startIndex = Math.min(measureStart.index, crosshair.index);
    const endIndex = Math.max(measureStart.index, crosshair.index);
    if(startIndex < 0 || endIndex >= data.length) return null;
    
    // Safety check for indices relative to data
    const safeStart = Math.max(0, startIndex);
    const safeEnd = Math.min(data.length - 1, endIndex);
    const slice = data.slice(safeStart, safeEnd + 1);
    if(slice.length === 0) return null;
    
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    
    // Change: Last Close - First Open
    const startBar = slice[0];
    const endBar = slice[slice.length - 1];
    const change = endBar.close - startBar.open;
    const changePercent = (change / startBar.open) * 100;
    
    return { high, low, change, changePercent, count: slice.length };
  };

  const rangeStats = showMeasure && measureType === 'range' ? getRangeStats() : null;

  return (
    <div className={`flex flex-1 h-full overflow-hidden border-b relative ${isDark ? 'border-border' : 'border-gray-200'}`}>
        <div className={`h-full relative border-r transition-all duration-300 ${showOrderBook ? 'w-[68%]' : 'w-full'} ${isDark ? 'bg-app border-border' : 'bg-white border-gray-200'}`}>
            
            {/* 1. Chart Container - Render FIRST so overlays are on top */}
            {/* Added cursor style based on mode */}
            <div ref={chartContainerRef} className={`w-full h-full ${drawMode || showMeasure ? 'cursor-crosshair' : ''}`} />

            {/* 2. MA Labels */}
            {showMA && (
                <div className="absolute top-2 left-2 z-10 flex gap-3 text-[10px] font-mono font-medium opacity-80 pointer-events-none">
                    <span className="text-yellow-500">MA5: {displayMA5}</span>
                    <span className="text-purple-500">MA10: {displayMA10}</span>
                </div>
            )}
            
            {/* 3. Toggle Button - High Z-Index to avoid being blocked */}
            <div 
                onClick={onToggleOrderBook}
                className={`absolute top-2 right-2 z-50 p-1 rounded-full cursor-pointer shadow-sm ${
                    isDark ? 'text-textSub bg-panel border border-border' : 'text-gray-500 bg-white border border-gray-200'
                }`}
            >
                <div className="transform -rotate-90">
                    {showOrderBook ? <ChevronDownIcon /> : <ChevronUpIcon />}
                </div>
            </div>

            {/* 4. SVG Layer for Drawings - z-40, pointer-events-none for container */}
            <svg className="absolute inset-0 z-40 pointer-events-none w-full h-full overflow-hidden">
                {overlayLines.map((l, i) => (
                    <g key={i} className="pointer-events-auto cursor-pointer group">
                         <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="transparent" strokeWidth={10} onDoubleClick={(e) => handleLineDoubleClick(e, l.id)}/>
                         <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={l.width} className="group-hover:opacity-70 transition-opacity"/>
                         {l.locked && <text x={l.x2-15} y={l.y1-5} fill={l.color} fontSize="10">🔒</text>}
                    </g>
                ))}
            </svg>
            
            {/* 5. Dynamic Measurement Layer - z-40 */}
            {showMeasure && measureStart && crosshair && chartRef.current && seriesRef.current && (
                <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
                    {(() => {
                        const startX = chartRef.current.timeScale().timeToCoordinate(measureStart.time as Time) ?? -100;
                        const startY = seriesRef.current.priceToCoordinate(measureStart.price) ?? -100;
                        
                        if (measureType === 'vector') {
                            return (
                                <svg className="w-full h-full">
                                    <line x1={startX} y1={startY} x2={crosshair.x} y2={crosshair.y} stroke="#0a84ff" strokeWidth={1} strokeDasharray="4 4" />
                                    <circle cx={startX} cy={startY} r="3" fill="#0a84ff" />
                                    <circle cx={crosshair.x} cy={crosshair.y} r="3" fill="#0a84ff" />
                                </svg>
                            );
                        } else {
                            // Range Mode
                            const width = crosshair.x - startX;
                            const left = width > 0 ? startX : crosshair.x;
                            const absWidth = Math.abs(width);
                            
                            return (
                                <div className="w-full h-full relative">
                                    {/* Vertical Dashed Boundaries */}
                                    <div className="absolute top-0 bottom-0 border-l border-dashed border-accent" style={{ left: startX }}></div>
                                    <div className="absolute top-0 bottom-0 border-l border-dashed border-accent" style={{ left: crosshair.x }}></div>
                                    {/* Shaded Area */}
                                    <div 
                                        style={{ left, top: 0, width: absWidth, height: '100%' }}
                                        className="absolute bg-accent/20 border-t-0 border-b-0"
                                    />
                                </div>
                            );
                        }
                    })()}
                </div>
            )}
            
            {/* 6. Magnet Indicator - z-40 */}
            {crosshairMode === 'magnet' && crosshair && (
                 <div 
                    className="absolute w-3 h-3 bg-accent/80 rounded-full border-2 border-white dark:border-app z-40 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-sm animate-pop"
                    style={{ left: crosshair.x, top: crosshair.y }}
                 />
            )}

            {/* REMOVED blocking capture div here to restore interaction */}

            {/* 8. Measure Tooltip - z-50 */}
            {showMeasure && measureStart && crosshair && (
                 <div className="absolute z-50 pointer-events-none bg-panel/90 backdrop-blur text-white text-[10px] p-2.5 rounded-lg shadow-xl font-mono border border-border"
                      style={{ top: 60, left: '50%', transform: 'translateX(-50%)', minWidth: 160 }}>
                     <div className="font-bold mb-1 text-accent border-b border-white/10 pb-1">{measureType === 'range' ? '区间统计' : '测量'}</div>
                     <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                         {measureType === 'vector' ? (
                            <>
                                <span className="text-gray-400">价差:</span>
                                <span className={(crosshair.price - measureStart.price) >= 0 ? 'text-up' : 'text-down'}>
                                    {formatPrice(crosshair.price - measureStart.price, symbolCode)} ({((crosshair.price - measureStart.price)/measureStart.price * 100).toFixed(2)}%)
                                </span>
                                <span className="text-gray-400">K线数:</span>
                                <span>{Math.abs(crosshair.index - measureStart.index)} 根</span>
                            </>
                         ) : rangeStats ? (
                            <>
                                <span className="text-gray-400">涨跌:</span>
                                <span className={rangeStats.change >= 0 ? 'text-up' : 'text-down'}>{rangeStats.change > 0 ? '+' : ''}{formatPrice(rangeStats.change, symbolCode)}</span>
                                <span className="text-gray-400">幅度:</span>
                                <span className={rangeStats.changePercent >= 0 ? 'text-up' : 'text-down'}>{rangeStats.changePercent > 0 ? '+' : ''}{rangeStats.changePercent.toFixed(2)}%</span>
                                <span className="text-gray-400">最高:</span>
                                <span>{formatPrice(rangeStats.high, symbolCode)}</span>
                                <span className="text-gray-400">最低:</span>
                                <span>{formatPrice(rangeStats.low, symbolCode)}</span>
                                <span className="text-gray-400">K线数:</span>
                                <span>{rangeStats.count} 根</span>
                            </>
                         ) : (
                             <span className="col-span-2">计算中...</span>
                         )}
                     </div>
                 </div>
            )}
            
            {/* 9. Editor Popup - Centered z-50 */}
            {editingDrawingId && (
                <div 
                    className="absolute z-50 bg-panel border border-border rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[180px] animate-pop top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-xs font-bold text-gray-400 mb-1">画线设置</div>
                    <div className="flex gap-2">
                        {['#0a84ff', '#ff3b30', '#34c759', '#ffd60a', '#ffffff'].map(c => (
                            <div key={c} onClick={() => updateDrawing(editingDrawingId, { color: c })} className="w-5 h-5 rounded-full cursor-pointer border border-white/10 hover:scale-110 transition-transform" style={{ background: c }} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">粗细</span>
                        <input type="range" min="1" max="5" onChange={(e) => updateDrawing(editingDrawingId, { lineWidth: parseInt(e.target.value) })} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="flex gap-2 mt-1">
                         <button 
                            onClick={() => {
                                const d = drawings.find(x => x.id === editingDrawingId);
                                if(d) updateDrawing(editingDrawingId, { locked: !d.locked });
                                setEditingDrawingId(null);
                            }}
                            className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs flex items-center justify-center gap-1"
                        >
                            <LockIcon locked={drawings.find(x => x.id === editingDrawingId)?.locked || false} />
                            {drawings.find(x => x.id === editingDrawingId)?.locked ? '解锁' : '锁定'}
                         </button>
                    </div>
                </div>
            )}
        </div>
        
        {/* Order Book Area */}
        <div className={`flex flex-col font-mono transition-all duration-300 overflow-hidden ${showOrderBook ? 'w-[32%]' : 'w-0'} ${isDark ? 'bg-panel' : 'bg-gray-50'}`}>
            <div className={`p-1.5 text-center text-[10px] border-b font-sans font-medium ${isDark ? 'text-textSub border-border' : 'text-gray-500 border-gray-200'}`}>五档盘口</div>
            <div className="flex flex-col gap-0.5 overflow-y-auto py-1">
                <div className="flex flex-col-reverse">
                    {orderBook.asks.slice(0, 5).map((ask, i) => (
                        <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 items-center relative group text-xs">
                            <div className="absolute inset-0 bg-down/10 w-[0%] group-hover:w-[100%] transition-all" style={{width: `${Math.random()*40}%`}}></div>
                            <span className="text-down w-5 relative z-10 opacity-80">卖{i+1}</span>
                            <span className="text-down flex-1 text-right relative z-10 font-bold tracking-tight">{formatPrice(ask.price, symbolCode)}</span>
                            <span className={`w-8 text-right relative z-10 opacity-70 ${isDark ? 'text-textSub' : 'text-gray-400'}`}>{ask.vol}</span>
                        </div>
                    ))}
                </div>
                <div className={`text-center py-2 text-lg font-bold my-1 border-y tracking-tight ${
                    isDark ? 'bg-[#252526] border-border' : 'bg-gray-200 border-gray-300'
                } ${lastPrice >= (data[data.length-2]?.close || 0) ? 'text-up' : 'text-down'}`}>
                    {formatPrice(lastPrice, symbolCode)}
                </div>
                <div className="flex flex-col">
                    {orderBook.bids.slice(0, 5).map((bid, i) => (
                        <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 items-center relative group text-xs">
                            <div className="absolute inset-0 bg-up/10 w-[0%] group-hover:w-[100%] transition-all" style={{width: `${Math.random()*40}%`}}></div>
                            <span className="text-up w-5 relative z-10 opacity-80">买{i+1}</span>
                            <span className="text-up flex-1 text-right relative z-10 font-bold tracking-tight">{formatPrice(bid.price, symbolCode)}</span>
                            <span className={`w-8 text-right relative z-10 opacity-70 ${isDark ? 'text-textSub' : 'text-gray-400'}`}>{bid.vol}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Market Depth Details (Compacted) */}
            <div className={`mt-1 flex-1 border-t p-2 overflow-y-auto ${isDark ? 'border-border' : 'border-gray-200'}`}>
                <div className={`text-[10px] font-bold mb-1 ${isDark ? 'text-textSub' : 'text-gray-500'}`}>详情</div>
                <div className="grid grid-cols-2 gap-y-1 gap-x-1 text-[10px] leading-tight">
                     <div className="flex justify-between"><span className="text-gray-500">持仓</span><span className={isDark?'text-white':'text-gray-900'}>{(data[data.length-1]?.volume * 1.5).toFixed(0)}</span></div>
                     <div className="flex justify-between"><span className="text-gray-500">日增</span><span className="text-up">+{(Math.random()*1000).toFixed(0)}</span></div>
                     <div className="flex justify-between"><span className="text-gray-500">涨停</span><span className="text-up">{formatPrice(lastPrice*1.05, symbolCode)}</span></div>
                     <div className="flex justify-between"><span className="text-gray-500">跌停</span><span className="text-down">{formatPrice(lastPrice*0.95, symbolCode)}</span></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ChartBoard;
    