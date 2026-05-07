/**
 * 终端面板
 */

import React, { useState, useRef, useEffect } from 'react';
import './TerminalPanel.css';

interface TerminalPanelProps {
  onClose: () => void;
}

interface Command {
  id: string;
  command: string;
  output: string;
  error: string;
  timestamp: Date;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose }) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('~');
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [commands]);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;
    
    const command = input.trim();
    setInput('');
    setIsExecuting(true);
    
    try {
      if (window.mimoAPI) {
        const result = await window.mimoAPI.terminal.execute(command, cwd);
        
        const newCommand: Command = {
          id: Date.now().toString(),
          command,
          output: result.stdout || '',
          error: result.stderr || result.error || '',
          timestamp: new Date()
        };
        
        setCommands(prev => [...prev, newCommand]);
      }
    } catch (error) {
      const newCommand: Command = {
        id: Date.now().toString(),
        command,
        output: '',
        error: (error as Error).message,
        timestamp: new Date()
      };
      setCommands(prev => [...prev, newCommand]);
    }
    
    setIsExecuting(false);
    inputRef.current?.focus();
  };
  
  const handleClear = () => {
    setCommands([]);
  };
  
  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">⌨️ 终端</span>
        <div className="terminal-actions">
          <button onClick={handleClear} title="清空">🗑️</button>
          <button onClick={onClose} title="关闭">✕</button>
        </div>
      </div>
      
      <div className="terminal-output" ref={outputRef}>
        {commands.map((cmd) => (
          <div key={cmd.id} className="command-block">
            <div className="command-line">
              <span className="prompt">{cwd} $</span>
              <span className="command">{cmd.command}</span>
            </div>
            {cmd.output && <pre className="output">{cmd.output}</pre>}
            {cmd.error && <pre className="error">{cmd.error}</pre>}
          </div>
        ))}
        {isExecuting && (
          <div className="executing">
            <span className="prompt">{cwd} $</span>
            <span className="command">{input}</span>
            <span className="cursor">▋</span>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="terminal-input">
        <span className="prompt">{cwd} $</span>
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
