import { motion } from 'motion/react';
import { RotateCcw, Sparkles } from 'lucide-react';
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
}

export function Header({ onReset, hasData, data, chartRef, title }: HeaderProps) {
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
