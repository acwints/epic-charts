import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { ChartData, ChartConfig } from '../types';
import { COLOR_PALETTES } from '../types';
import { generateInfographic } from '../services/infographicGenerator';
import './ChartPreview.css';

interface ChartPreviewProps {
  data: ChartData;
  config: ChartConfig;
}

export function ChartPreview({ data, config }: ChartPreviewProps) {
  const colors = COLOR_PALETTES[config.colorScheme];
  const [infographicSvg, setInfographicSvg] = useState<string | null>(null);
  const [infographicLoading, setInfographicLoading] = useState(false);
  const [infographicError, setInfographicError] = useState<string | null>(null);

  // Generate infographic when type changes to infographic
  useEffect(() => {
    if (config.type === 'infographic' && !infographicSvg && !infographicLoading) {
      generateInfographicSvg();
    }
  }, [config.type]);

  const generateInfographicSvg = async () => {
    setInfographicLoading(true);
    setInfographicError(null);
    try {
      const svg = await generateInfographic(data, config.title, config.colorScheme);
      setInfographicSvg(svg);
    } catch (err) {
      setInfographicError(err instanceof Error ? err.message : 'Failed to generate infographic');
    } finally {
      setInfographicLoading(false);
    }
  };

  const regenerateInfographic = () => {
    setInfographicSvg(null);
    generateInfographicSvg();
  };

  const chartData = useMemo(() => {
    return data.labels.map((label, idx) => {
      const point: Record<string, string | number> = { name: label };
      data.series.forEach((series) => {
        point[series.name] = series.data[idx];
      });
      return point;
    });
  }, [data]);

  const pieData = useMemo(() => {
    if (config.type !== 'pie') return [];
    return data.series[0].data.map((value, idx) => ({
      name: data.labels[idx],
      value,
    }));
  }, [data, config.type]);

  const radarData = useMemo(() => {
    if (config.type !== 'radar') return [];
    return data.labels.map((label, idx) => {
      const point: Record<string, string | number> = { subject: label };
      data.series.forEach((series) => {
        point[series.name] = series.data[idx];
      });
      return point;
    });
  }, [data, config.type]);

  const renderTable = () => {
    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="table-header-cell sticky-col"></th>
              {data.labels.map((label, idx) => (
                <th key={idx} className="table-header-cell">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.series.map((series, seriesIdx) => (
              <tr key={series.name}>
                <td className="table-row-label sticky-col">
                  <span
                    className="series-indicator"
                    style={{ background: colors[seriesIdx % colors.length] }}
                  />
                  {series.name}
                </td>
                {series.data.map((value, idx) => (
                  <td key={idx} className="table-cell">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInfographic = () => {
    if (infographicLoading) {
      return (
        <div className="infographic-loading">
          <Sparkles size={48} className="sparkle-icon" />
          <span className="loading-text">AI is creating your infographic...</span>
          <span className="loading-hint">This may take a few seconds</span>
        </div>
      );
    }

    if (infographicError) {
      return (
        <div className="infographic-error">
          <span>{infographicError}</span>
          <button className="retry-button" onClick={regenerateInfographic}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    if (infographicSvg) {
      return (
        <div className="infographic-container">
          <div
            className="infographic-svg"
            dangerouslySetInnerHTML={{ __html: infographicSvg }}
          />
          <button className="regenerate-button" onClick={regenerateInfographic}>
            <RefreshCw size={14} />
            Regenerate
          </button>
        </div>
      );
    }

    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
    };

    const gridElement = config.showGrid ? (
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
    ) : null;

    const xAxisElement = (
      <XAxis
        dataKey="name"
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
        tickLine={{ stroke: 'var(--text-muted)' }}
        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
      />
    );

    const yAxisElement = (
      <YAxis
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
        tickLine={{ stroke: 'var(--text-muted)' }}
        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
      />
    );

    const tooltipElement = (
      <Tooltip
        contentStyle={{
          background: 'var(--bg-elevated)',
          border: 'var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
        }}
        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
        itemStyle={{ color: 'var(--text-secondary)' }}
      />
    );

    const legendElement = config.showLegend ? (
      <Legend
        wrapperStyle={{
          paddingTop: '20px',
        }}
        formatter={(value) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{value}</span>
        )}
      />
    ) : null;

    switch (config.type) {
      case 'table':
        return null; // Handled separately

      case 'infographic':
        return null; // Handled separately

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {data.series.map((series, idx) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                fill={colors[idx % colors.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={config.animate ? 800 : 0}
                animationBegin={idx * 100}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {data.series.map((series, idx) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[idx % colors.length], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, stroke: colors[idx % colors.length], strokeWidth: 2, fill: 'var(--bg-primary)' }}
                animationDuration={config.animate ? 1200 : 0}
                animationBegin={idx * 200}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {data.series.map((series, idx) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={config.animate ? 1000 : 0}
                animationBegin={idx * 150}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            {tooltipElement}
            {legendElement}
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              animationDuration={config.animate ? 1000 : 0}
              label={config.showValues ? ({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)` : false}
              labelLine={config.showValues}
            >
              {pieData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            {tooltipElement}
            {legendElement}
            {data.series.map((series, idx) => (
              <Radar
                key={series.name}
                name={series.name}
                dataKey={series.name}
                stroke={colors[idx % colors.length]}
                fill={colors[idx % colors.length]}
                fillOpacity={0.3}
                animationDuration={config.animate ? 800 : 0}
              />
            ))}
          </RadarChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {data.series.map((series, idx) => (
              <Scatter
                key={series.name}
                name={series.name}
                data={series.data.map((value, i) => ({ x: i + 1, y: value, name: data.labels[i] }))}
                fill={colors[idx % colors.length]}
                animationDuration={config.animate ? 800 : 0}
              />
            ))}
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      className="chart-preview"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="chart-header">
        {config.title ? (
          <h2 className="chart-title">{config.title}</h2>
        ) : (
          <h2 className="chart-title-placeholder">Your Chart</h2>
        )}
        <div className="chart-meta">
          <span className="chart-meta-item">
            <span className="meta-label">Source:</span>
            <span className="meta-value">{data.sourceType.toUpperCase()}</span>
          </span>
          <span className="chart-meta-item">
            <span className="meta-label">Points:</span>
            <span className="meta-value">{data.labels.length}</span>
          </span>
          <span className="chart-meta-item">
            <span className="meta-label">Series:</span>
            <span className="meta-value">{data.series.length}</span>
          </span>
        </div>
      </div>

      <div className="chart-container">
        {config.type === 'table' ? (
          renderTable()
        ) : config.type === 'infographic' ? (
          renderInfographic()
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {config.type !== 'table' && config.type !== 'infographic' && (
        <div className="chart-color-bar">
          {colors.slice(0, data.series.length).map((color, idx) => (
            <div
              key={idx}
              className="color-segment"
              style={{ background: color }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
