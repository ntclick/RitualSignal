import React, { useEffect, useRef } from 'react'
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, HistogramSeries, LineSeries
} from 'lightweight-charts'

export const TradingViewLightweightChart = ({
  symbol = 'BTCUSDT',
  timeframe = '4h',
  currentPrice = 1.0,
  overlays = [],
  tradeData = null
}) => {
  const chartContainerRef = useRef(null)
  const chartRef          = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    if (chartRef.current) {
      try { chartRef.current.remove() } catch (e) {}
      chartRef.current = null
    }

    const container = chartContainerRef.current
    if (!container) return

    try {
      const chart = createChart(container, {
        width: container.clientWidth || 600,
        height: 340,
        layout: {
          background: { type: ColorType.Solid, color: '#09090B' },
          textColor: '#a1a1aa'
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.03)' }
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed },
          horzLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed }
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          scaleMargins: { top: 0.15, bottom: 0.25 }
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          timeVisible: true,
          secondsVisible: false
        }
      })

      chartRef.current = chart

      const candleOptions = {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e'
      }

      const candleSeries = typeof chart.addSeries === 'function'
        ? chart.addSeries(CandlestickSeries, candleOptions)
        : (typeof chart.addCandlestickSeries === 'function' ? chart.addCandlestickSeries(candleOptions) : null)

      if (!candleSeries) return

      const volumeOptions = {
        color: '#3b82f6',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume'
      }

      const volumeSeries = typeof chart.addSeries === 'function'
        ? chart.addSeries(HistogramSeries, volumeOptions)
        : (typeof chart.addHistogramSeries === 'function' ? chart.addHistogramSeries(volumeOptions) : null)

      if (chart.priceScale) {
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 }
        })
      }

      const formatChartPriceLabel = (val) => {
        if (!val || isNaN(val) || val <= 0) return '0.00'
        const num = Number(val)
        if (num < 0.0001) return num.toFixed(8)
        if (num < 0.01) return num.toFixed(6)
        if (num < 1) return num.toFixed(4)
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }

      const cleanSym = (symbol || 'BTCUSDT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const interval = (timeframe || '4h').toLowerCase()
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'
      const klinesEndpoint = `${backendUrl}/api/klines?symbol=${cleanSym}&interval=${interval}&limit=60`

      const renderDataAndOverlays = (loadedCandles, loadedVolume) => {
        if (candleSeries && typeof candleSeries.setData === 'function') {
          candleSeries.setData(loadedCandles)
        }
        if (volumeSeries && typeof volumeSeries.setData === 'function') {
          volumeSeries.setData(loadedVolume)
        }

        const basePrice = loadedCandles.length > 0 ? loadedCandles[loadedCandles.length - 1].close : Number(currentPrice || 1.0)

        // Entry, TP, SL price lines
        const entryVal = Number(tradeData?.entry || basePrice) || basePrice
        const tpVal = Number(tradeData?.takeProfit || basePrice * 1.057) || (basePrice * 1.057)
        const slVal = Number(tradeData?.stopLoss || basePrice * 0.978) || (basePrice * 0.978)

        if (typeof candleSeries.createPriceLine === 'function') {
          candleSeries.createPriceLine({
            price: entryVal,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `ENTRY $${formatChartPriceLabel(entryVal)}`
          })
          candleSeries.createPriceLine({
            price: tpVal,
            color: '#10b981',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP $${formatChartPriceLabel(tpVal)}`
          })
          candleSeries.createPriceLine({
            price: slVal,
            color: '#f43f5e',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL $${formatChartPriceLabel(slVal)}`
          })
        }

        // EMA lines calculation
        const calculateEMA = (period) => {
          if (loadedCandles.length === 0) return []
          const k = 2 / (period + 1)
          let ema = loadedCandles[0].close
          const emaData = []
          for (let i = 0; i < loadedCandles.length; i++) {
            ema = loadedCandles[i].close * k + ema * (1 - k)
            emaData.push({ time: loadedCandles[i].time, value: ema })
          }
          return emaData
        }

        const emaPeriods = [20, 50]
        const colorMap = { 20: '#06b6d4', 50: '#a855f7', 200: '#f59e0b' }
        emaPeriods.forEach((period) => {
          try {
            const lineOptions = {
              color: colorMap[period] || '#3b82f6',
              lineWidth: 1,
              title: `EMA ${period}`
            }
            const emaLine = typeof chart.addSeries === 'function'
              ? chart.addSeries(LineSeries, lineOptions)
              : (typeof chart.addLineSeries === 'function' ? chart.addLineSeries(lineOptions) : null)

            if (emaLine && typeof emaLine.setData === 'function') {
              emaLine.setData(calculateEMA(period))
            }
          } catch (_) {}
        })

        if (chart.timeScale && typeof chart.timeScale().fitContent === 'function') {
          try { chart.timeScale().fitContent() } catch (e) {}
        }
      }

      fetch(klinesEndpoint)
        .then(res => res.json())
        .then(data => {
          if (data && data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
            const candles = data.candles.map(c => ({
              time: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close
            }))
            const volumeData = data.candles.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
            }))
            renderDataAndOverlays(candles, volumeData)
          } else {
            throw new Error('Fallback to direct Binance')
          }
        })
        .catch(() => {
          fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanSym}&interval=${interval}&limit=60`)
            .then(res => res.json())
            .then(klines => {
              if (Array.isArray(klines) && klines.length > 0) {
                const candles = klines.map(k => ({
                  time: Math.floor(k[0] / 1000),
                  open: parseFloat(k[1]),
                  high: parseFloat(k[2]),
                  low: parseFloat(k[3]),
                  close: parseFloat(k[4])
                }))
                const volumeData = klines.map(k => ({
                  time: Math.floor(k[0] / 1000),
                  value: parseFloat(k[5]),
                  color: parseFloat(k[4]) >= parseFloat(k[1]) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
                }))
                renderDataAndOverlays(candles, volumeData)
              }
            })
            .catch(() => {})
        })

    } catch (chartErr) {
      console.warn('[Chart Engine Note]:', chartErr)
    }

    const handleResize = () => {
      if (container && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: container.clientWidth || 600 })
        } catch (e) {}
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        try { chartRef.current.remove() } catch (e) {}
        chartRef.current = null
      }
    }
  }, [symbol, timeframe, currentPrice, JSON.stringify(overlays), JSON.stringify(tradeData)])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: '#09090B',
        borderRadius: 18,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        padding: 16
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '0 4px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>{symbol} {timeframe.toUpperCase()}</span>
          <span style={{ color: '#06b6d4' }}>● EMA 20</span>
          <span style={{ color: '#a855f7' }}>● EMA 50</span>
          <span style={{ color: '#3b82f6' }}>● ENTRY</span>
          <span style={{ color: '#10b981' }}>● TP</span>
          <span style={{ color: '#f43f5e' }}>● SL</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Interactive TradingView Engine
        </div>
      </div>

      <div ref={chartContainerRef} style={{ width: '100%', height: 340 }} />
    </div>
  )
}
