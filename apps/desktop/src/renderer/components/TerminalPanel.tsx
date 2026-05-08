/**
 * 终端面板（支持多标签页）
 */

import React, { useState, useEffect, useRef } from 'react';
import './TerminalPanel.css';

interface TerminalTab {
  id: string;
  title: string;
  cwd: string;
  history: TerminalCommand[];
}

interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  error: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  onClose: () => void;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'tab-1', title: '终端 1', cwd: '~', history: [] }
  ]);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTabData = tabs.find(t => t.id === activeTab);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [activeTabData?.history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;

    const command = input.trim();
    setInput('');
    setIsExecuting(true);

    try {
      if (window.mimoAPI) {
        const result = await window.mimoAPI.terminal.execute(command, activeTabData?.cwd || '~');

        const newCommand: TerminalCommand = {
          id: Date.now().toString(),
          command,
          output: result.stdout || '',
          error: result.stderr || result.error || '',
          timestamp: new Date()
        };

        setTabs(prev => prev.map(tab =>
          tab.id === activeTab
            ? { ...tab, history: [...tab.history, newCommand], cwd: result.cwd || tab.cwd }
            : tab
        ));
      }
    } catch (error) {
      const newCommand: TerminalCommand = {
        id: Date.now().toString(),
        command,
        output: '',
        error: (error as Error).message,
        timestamp: new Date()
      };

      setTabs(prev => prev.map(tab =>
        tab.id === activeTab
          ? { ...tab, history: [...tab.history, newCommand] }
          : tab
      ));
    }

    setIsExecuting(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTab
        ? { ...tab, history: [] }
        : tab
    ));
  };

  const handleNewTab = () => {
    const newTab: TerminalTab = {
      id: `tab-${Date.now()}`,
      title: `终端 ${tabs.length + 1}`,
      cwd: '~',
      history: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (tabs.length === 1) {
      // 最后一个标签，关闭整个面板
      onClose();
      return;
    }
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setActiveTab(remaining[remaining.length - 1].id);
    }
  };

  return (
    <div className="terminal-panel">
      {/* 标题栏 */}
      <div className="terminal-header">
        <div className="terminal-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`terminal-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">⌨️</span>
              <span className="tab-title">{tab.title}</span>
              <span
                className="tab-close"
                onClick={(e) => handleCloseTab(tab.id, e)}
              >×</span>
            </div>
          ))}
          <button className="new-tab" onClick={handleNewTab} title="新建终端">+</button>
        </div>
        <div className="terminal-actions">
          <button onClick={handleClear} title="清空">🗑️</button>
          <button onClick={onClose} title="关闭">✕</button>
        </div>
      </div>

      {/* 输出区域 */}
      <div className="terminal-output" ref={outputRef}>
        {activeTabData?.history.map((cmd) => (
          <div key={cmd.id} className="command-block">
            <div className="command-line">
              <span className="prompt">{activeTabData.cwd} $</span>
              <span className="command">{cmd.command}</span>
            </div>
            {cmd.output && <pre className="output">{cmd.output}</pre>}
            {cmd.error && <pre className="error">{cmd.error}</pre>}
          </div>
        ))}
        {isExecuting && (
          <div className="executing">
            <span className="prompt">{activeTabData?.cwd} $</span>
            <span className="command">{input}</span>
            <span className="cursor">▋</span>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <form onSubmit={handleSubmit} className="terminal-input">
        <span className="prompt">{activeTabData?.cwd} $</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入命令..."
          autoFocus
        />
      </form>
    </div>
  );
};

export default TerminalPanel;
