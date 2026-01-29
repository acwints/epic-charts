import { motion } from 'motion/react';
import './Hero.css';

export function Hero() {
  return (
    <div className="hero">
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="hero-eyebrow">Data visualization, refined</p>

        <h1 className="hero-title">
          Transform your data into <em>stunning visualizations</em>
        </h1>

        <p className="hero-subtitle">
          Drop in your data — CSV, spreadsheet, or a screenshot of an existing chart.
          AI generates beautiful charts instantly.
        </p>
      </motion.div>
    </div>
  );
}
