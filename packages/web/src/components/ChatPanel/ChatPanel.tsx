import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Loader2,
  Database,
  Settings,
  X,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import type { ChartData, ChartConfig } from '../../types';
import {
  sendChatMessage,
  generateMessageId,
  type ChatMessage,
} from '../../services/chartChatService';
import './ChatPanel.css';

interface ChatPanelProps {
  data: ChartData;
  config: ChartConfig;
  onDataChange: (data: ChartData) => void;
  onConfigChange: (config: ChartConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({
  data,
  config,
  onDataChange,
  onConfigChange,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I can help you understand and refine your data. Ask me questions like \"What's the highest value?\" or \"Which category is performing best?\" - or ask me to modify the chart by adding columns, changing colors, or computing totals.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(
        userMessage.content,
        data,
        config,
        messages
      );

      // Apply data changes if any
      if (response.updatedData) {
        onDataChange(response.updatedData);
      }

      // Apply config changes if any
      if (response.updatedConfig) {
        onConfigChange({ ...config, ...response.updatedConfig });
      }

      const isInsightOnly = !response.changes.dataModified && !response.changes.configModified;
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        changes: isInsightOnly
          ? { ...response.changes, summary: 'insight' }
          : response.changes,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="chat-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="chat-header">
            <div className="chat-header-title">
              <Sparkles size={16} />
              <span>AI Assistant</span>
            </div>
            <button className="chat-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`chat-message ${message.role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="message-content">{message.content}</div>
                {message.changes && (
                  <div className="message-changes">
                    {!message.changes.dataModified && !message.changes.configModified && message.changes.summary === 'insight' && (
                      <span className="change-badge insight">
                        <Lightbulb size={10} />
                        Insight
                      </span>
                    )}
                    {message.changes.dataModified && (
                      <span className="change-badge data">
                        <Database size={10} />
                        Data modified
                      </span>
                    )}
                    {message.changes.configModified && (
                      <span className="change-badge config">
                        <Settings size={10} />
                        Settings changed
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                className="chat-message assistant loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Loader2 size={16} className="spin" />
                <span>Thinking...</span>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask me to modify your chart..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              className="chat-send"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>

          <div className="chat-suggestions">
            <span className="suggestions-label">Try:</span>
            <button
              className="suggestion-chip"
              onClick={() => setInput("What's the highest value in the data?")}
            >
              Highest value?
            </button>
            <button
              className="suggestion-chip"
              onClick={() => setInput('Add a Total column')}
            >
              Add totals
            </button>
            <button
              className="suggestion-chip"
              onClick={() => setInput('Summarize this data')}
            >
              Summarize
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChatToggleButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <motion.button
      className={`chat-toggle-button ${isOpen ? 'active' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageSquare size={18} />
      <span>AI Chat</span>
    </motion.button>
  );
}
