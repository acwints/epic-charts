import { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartStylePicker } from '../ChartStylePicker/ChartStylePicker';
import { EditableSpreadsheet } from '../EditableSpreadsheet/EditableSpreadsheet';
import type { ChartData, ChartConfig, ChartType, ColorScheme, EditableChartState } from '../../types';
import { COLOR_PALETTES } from '../../types';
import './ReverseEngineerView.css';

interface ReverseEngineerViewProps {
  initialData: ChartData;
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  chartRef: React.RefObject<HTMLDivElement | null>;
}

export function ReverseEngineerView({
  initialData,
  config,
  onConfigChange,
  chartRef,
}: ReverseEngineerViewProps) {
  const [editableState, setEditableState] = useState<EditableChartState>({
    original: initialData,
    current: initialData,
    isDirty: false,
  });

  const colors = COLOR_PALETTES[config.colorScheme];

  const handleStyleSelect = useCallback(
    (type: ChartType, colorScheme: ColorScheme) => {
      onConfigChange({ ...config, type, colorScheme });
    },
    [config, onConfigChange]
  );

  const handleDataChange = useCallback((newData: ChartData) => {
    setEditableState((prev) => ({
      ...prev,
      current: newData,
      isDirty: true,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setEditableState((prev) => ({
      ...prev,
      current: prev.original,
      isDirty: false,
    }));
  }, []);

  const chartData = useMemo(() => {
    return editableState.current.labels.map((label, idx) => {
      const point: Record<string, string | number> = { name: label };
      editableState.current.series.forEach((series) => {
        point[series.name] = series.data[idx];
      });
      return point;
    });
  }, [editableState.current]);

  const renderChart = () => {
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
        wrapperStyle={{ paddingTop: '20px' }}
        formatter={(value) => (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{value}</span>
        )}
      />
    ) : null;

    const commonProps = { data: chartData };

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {editableState.current.series.map((series, idx) => (
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
            {editableState.current.series.map((series, idx) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[idx % colors.length], strokeWidth: 0, r: 4 }}
                activeDot={{
                  r: 6,
                  stroke: colors[idx % colors.length],
                  strokeWidth: 2,
                  fill: 'var(--bg-primary)',
                }}
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
            {editableState.current.series.map((series, idx) => (
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

      default:
        return (
          <BarChart {...commonProps}>
            {gridElement}
            {xAxisElement}
            {yAxisElement}
            {tooltipElement}
            {legendElement}
            {editableState.current.series.map((series, idx) => (
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
    }
  };

  return (
    <motion.div
      className="reverse-engineer-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="re-main">
        <div className="re-chart-section">
          <ChartStylePicker
            data={editableState.current}
            config={config}
            onStyleSelect={handleStyleSelect}
          />

          <div className="re-chart-preview" ref={chartRef}>
            <div className="re-chart-header">
              {config.title ? (
                <h2 className="re-chart-title">{config.title}</h2>
              ) : (
                <h2 className="re-chart-title-placeholder">Your Chart</h2>
              )}
              <div className="re-chart-meta">
                <span className="re-meta-item">
                  <span className="meta-label">Source:</span>
                  <span className="meta-value">IMAGE</span>
                </span>
                <span className="re-meta-item">
                  <span className="meta-label">Points:</span>
                  <span className="meta-value">{editableState.current.labels.length}</span>
                </span>
                <span className="re-meta-item">
                  <span className="meta-label">Series:</span>
                  <span className="meta-value">{editableState.current.series.length}</span>
                </span>
              </div>
            </div>

            <div className="re-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>

            <div className="re-color-bar">
              {colors.slice(0, editableState.current.series.length).map((color, idx) => (
                <div key={idx} className="color-segment" style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>

        <EditableSpreadsheet
          data={editableState.current}
          colorScheme={config.colorScheme}
          isDirty={editableState.isDirty}
          onChange={handleDataChange}
          onReset={handleReset}
        />
      </div>
    </motion.div>
  );
}
