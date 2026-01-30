import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { DataInput } from './components/DataInput';
import { ChartPreview } from './components/ChartPreview';
import { ChartControls } from './components/ChartControls';
import { ChatPanel, ChatToggleButton } from './components/ChatPanel';
import { Hero } from './components/Hero';
import { ReverseEngineerView } from './components/ReverseEngineerView/ReverseEngineerView';
import { recommendChartType } from './services/chartTypeRecommender';
import type { ChartData, ChartConfig } from './types';
import './App.css';

function App() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'table',
    colorScheme: 'default',
    styleVariant: 'professional',
    showGrid: true,
    showLegend: true,
    showValues: false,
    animate: true,
    title: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDataSubmit = useCallback(async (data: ChartData) => {
    // Apply title if suggested
    const updates: Partial<ChartConfig> = {};
    if (data.suggestedTitle) {
      updates.title = data.suggestedTitle;
    }

    // Use AI to recommend the best chart type and generate a summary
    setIsProcessing(true);
    try {
      const recommendation = await recommendChartType(data, { preferredType: data.suggestedType });
      const chosenType = data.suggestedType ?? recommendation.type;
      const enrichedData: ChartData = {
        ...data,
        suggestedType: chosenType,
        aiReasoning: recommendation.reasoning,
        aiSummary: recommendation.summary,
      };
      setChartData(enrichedData);
      setChartConfig(prev => ({
        ...prev,
        ...updates,
        type: chosenType,
      }));
    } catch (error) {
      console.error('AI recommendation failed:', error);
      // Fall back to table if AI fails
      const fallbackType = data.suggestedType ?? 'table';
      setChartData(data);
      setChartConfig(prev => ({ ...prev, ...updates, type: fallbackType }));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setChartData(null);
    setChartConfig({
      type: 'table',
      colorScheme: 'default',
      styleVariant: 'professional',
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
              <div className="chart-toolbar">
                <ChatToggleButton
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  isOpen={isChatOpen}
                />
              </div>
              <div className={`chart-workspace ${isChatOpen ? 'with-chat' : ''}`} ref={chartRef}>
                <div className="chart-column">
                  {chartData.aiSummary && (
                    <div className="chart-ai-summary">
                      <span className="chart-ai-label">AI Insight</span>
                      <p className="chart-ai-text">{chartData.aiSummary}</p>
                    </div>
                  )}
                  <ChartPreview data={chartData} config={chartConfig} />
                </div>
                <div className="chart-sidebar">
                  <ChartControls
                    config={chartConfig}
                    onChange={setChartConfig}
                    data={chartData}
                  />
                </div>
              </div>
              <ChatPanel
                data={chartData}
                config={chartConfig}
                onDataChange={setChartData}
                onConfigChange={setChartConfig}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen(!isChatOpen)}
              />
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
