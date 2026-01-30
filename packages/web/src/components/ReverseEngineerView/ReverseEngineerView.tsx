import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChartPreview } from '../ChartPreview';
import { ChartControls } from '../ChartControls';
import { ChatPanel } from '../ChatPanel';
import { EditableSpreadsheet } from '../EditableSpreadsheet/EditableSpreadsheet';
import type { ChartData, ChartConfig, EditableChartState } from '../../types';
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

  return (
    <motion.div
      className="reverse-engineer-view with-assistant"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="re-main-content">
        <div className="re-workspace">
          <div className="re-chart-area" ref={chartRef}>
            {editableState.current.aiSummary && (
              <div className="chart-ai-summary">
                <span className="chart-ai-label">AI Insight</span>
                <p className="chart-ai-text">{editableState.current.aiSummary}</p>
              </div>
            )}
            <ChartPreview data={editableState.current} config={config} />
          </div>
          <div className="re-controls-area">
            <ChartControls
              config={config}
              onChange={onConfigChange}
              data={editableState.current}
            />
          </div>
        </div>

        <div className="re-data-area">
          <EditableSpreadsheet
            data={editableState.current}
            colorScheme={config.colorScheme}
            isDirty={editableState.isDirty}
            onChange={handleDataChange}
            onReset={handleReset}
          />
        </div>
      </div>

      <ChatPanel
        data={editableState.current}
        config={config}
        onDataChange={handleDataChange}
        onConfigChange={onConfigChange}
      />
    </motion.div>
  );
}
