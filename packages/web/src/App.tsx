import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { DataInput } from './components/DataInput';
import { ChartPreview } from './components/ChartPreview';
import { ChartControls } from './components/ChartControls';
import { Hero } from './components/Hero';
import { ReverseEngineerView } from './components/ReverseEngineerView/ReverseEngineerView';
import type { ChartData, ChartConfig } from './types';
import './App.css';

function App() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    colorScheme: 'default',
    showGrid: true,
    showLegend: true,
    showValues: false,
    animate: true,
    title: '',
  });
  const [isProcessing, _setIsProcessing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDataSubmit = useCallback((data: ChartData) => {
    setChartData(data);

    // Apply AI suggestions if available (from image analysis)
    const updates: Partial<ChartConfig> = {};

    if (data.suggestedTitle) {
      updates.title = data.suggestedTitle;
    }

    if (data.suggestedType) {
      updates.type = data.suggestedType;
    } else {
      // Auto-detect best chart type based on data shape
      if (data.series.length > 3) {
        updates.type = 'line';
      } else if (data.labels.length <= 6) {
        updates.type = 'bar';
      }
    }

    if (Object.keys(updates).length > 0) {
      setChartConfig(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const handleReset = useCallback(() => {
    setChartData(null);
    setChartConfig({
      type: 'bar',
      colorScheme: 'default',
      showGrid: true,
      showLegend: true,
      showValues: false,
      animate: true,
      title: '',
    });
  }, []);

  const isImageSource = chartData?.sourceType === 'image';

  return (
    <div className="app">
      <Header
        onReset={handleReset}
        hasData={!!chartData}
        data={chartData}
        chartRef={chartRef}
        title={chartConfig.title}
      />

      <main className="main">
        <AnimatePresence mode="wait">
          {!chartData ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="input-view"
            >
              <Hero />
              <DataInput onSubmit={handleDataSubmit} isProcessing={isProcessing} />
            </motion.div>
          ) : isImageSource ? (
            <motion.div
              key="reverse-engineer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="chart-view"
            >
              <ReverseEngineerView
                initialData={chartData}
                config={chartConfig}
                onConfigChange={setChartConfig}
                chartRef={chartRef}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="chart-view"
            >
              <div className="chart-workspace" ref={chartRef}>
                <ChartPreview data={chartData} config={chartConfig} />
                <ChartControls
                  config={chartConfig}
                  onChange={setChartConfig}
                  data={chartData}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <span className="footer-brand">Epic Charts</span>
          <span className="footer-divider">•</span>
          <span className="footer-tagline">Data visualization, elevated</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
