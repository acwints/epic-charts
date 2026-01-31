import { motion } from 'motion/react';
import { RotateCcw, Sparkles, LayoutGrid } from 'lucide-react';
import { ExportMenu } from './ExportMenu/ExportMenu';
import { ThemeToggle } from './ThemeToggle';
import type { ChartData } from '../types';
import './Header.css';

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
  data?: ChartData | null;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  title?: string;
  onFeedClick?: () => void;
  showFeedButton?: boolean;
}

export function Header({ onReset, hasData, data, chartRef, title, onFeedClick, showFeedButton = true }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <motion.div
          className="logo-container"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>
          <span className="logo-text">Epic Charts</span>
          <span className="logo-badge">BETA</span>
        </motion.div>

        <motion.nav
          className="header-nav"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ThemeToggle />
          {showFeedButton && onFeedClick && (
            <button className="nav-button" onClick={onFeedClick}>
              <LayoutGrid size={16} />
              <span>Feed</span>
            </button>
          )}
          {hasData && (
            <>
              <button className="nav-button" onClick={onReset}>
                <RotateCcw size={16} />
                <span>New Chart</span>
              </button>
              {data && chartRef && (
                <ExportMenu data={data} chartRef={chartRef} title={title} />
              )}
            </>
          )}
        </motion.nav>
      </div>
    </header>
  );
}
