/**
 * 代码编辑器面板（支持多标签页）
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store';
import FileTree from './FileTree';
import './EditorPanel.css';

interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

const EditorPanel: React.FC = () => {
  const { currentProjectPath, setCurrentProjectPath } = useStore();
  const [files, setFiles] = useState<any[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 检测文件语言
  const detectLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'sh': 'shell',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[ext] || 'plaintext';
  };

  // 打开项目
  const handleOpenProject = async () => {
    if (window.mimoAPI) {
      const path = await window.mimoAPI.file.openDirectory();
      if (path) {
        setCurrentProjectPath(path);
        loadFiles(path);
      }
    }
  };

  // 加载文件列表
  const loadFiles = async (dirPath: string) => {
    if (window.mimoAPI) {
      try {
        const entries = await window.mimoAPI.file.listDir(dirPath);
        setFiles(entries);
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    }
  };

  // 打开文件（多标签页）
  const handleOpenFile = async (path: string) => {
    // 检查是否已打开
    const existing = openFiles.find(f => f.path === path);
    if (existing) {
      setActiveFile(path);
      return;
    }

    if (window.mimoAPI) {
      try {
        const content = await window.mimoAPI.file.read(path);
        const name = path.split(/[\\/]/).pop() || path;
        const newFile: OpenFile = {
          path,
          name,
          content,
          originalContent: content,
          isDirty: false,
          language: detectLanguage(name)
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFile(path);
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  // 关闭标签页
  const handleCloseTab = async (path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const file = openFiles.find(f => f.path === path);
    if (file?.isDirty) {
      const confirm = window.confirm(`文件 ${file.name} 已修改，是否保存？`);
      if (confirm) {
        await handleSaveFile(path);
      }
    }

    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (activeFile === path) {
      const remaining = openFiles.filter(f => f.path !== path);
      setActiveFile(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  // 保存文件
  const handleSaveFile = async (path?: string) => {
    const fileToSave = path 
      ? openFiles.find(f => f.path === path)
      : openFiles.find(f => f.path === activeFile);
    
    if (window.mimoAPI && fileToSave) {
      try {
        await window.mimoAPI.file.write(fileToSave.path, fileToSave.content);
        setOpenFiles(prev => prev.map(f => 
          f.path === fileToSave.path 
            ? { ...f, isDirty: false, originalContent: f.content }
            : f
        ));
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    }
  };

  // 自动保存（防抖）
  const scheduleAutoSave = useCallback((path: string, content: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 更新内容
    setOpenFiles(prev => prev.map(f => 
      f.path === path ? { ...f, content, isDirty: f.originalContent !== content } : f
    ));

    // 防抖保存（3秒后自动保存）
    saveTimerRef.current = setTimeout(async () => {
      const file = openFiles.find(f => f.path === path);
      if (file && file.isDirty) {
        await handleSaveFile(path);
      }
    }, 3000);
  }, [openFiles]);

  // 编辑器内容变化
  const handleEditorChange = (value: string | undefined, path: string) => {
    if (value !== undefined) {
      scheduleAutoSave(path, value);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile]);

  // 获取当前活动文件
  const activeFileData = openFiles.find(f => f.path === activeFile);

  // 获取文件图标
  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📜';
      case 'ts':
      case 'tsx':
        return '📘';
      case 'json':
        return '📋';
      case 'css':
      case 'scss':
        return '🎨';
      case 'html':
        return '🌐';
      case 'md':
        return '📝';
      case 'py':
        return '🐍';
      default:
        return '📄';
    }
  };

  return (
    <div className="editor-panel">
      {/* 文件树 */}
      <FileTree
        projectPath={currentProjectPath}
        currentFile={activeFile}
        onFileOpen={(path) => handleOpenFile(path)}
      />
      
      {/* 编辑器区域 */}
      <div className="editor-container">
        {openFiles.length > 0 ? (
          <>
            {/* 标签页栏 */}
            <div className="editor-tabs">
              {openFiles.map(file => (
                <div
                  key={file.path}
                  className={`tab ${activeFile === file.path ? 'active' : ''}`}
                  onClick={() => setActiveFile(file.path)}
                >
                  <span className="tab-icon">{getFileIcon(file.name, false)}</span>
                  <span className="tab-name">{file.name}</span>
                  {file.isDirty && <span className="dirty-dot">●</span>}
                  <span 
                    className="tab-close"
                    onClick={(e) => handleCloseTab(file.path, e)}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
            
            {/* 编辑器 */}
            {activeFileData && (
              <div className="editor-wrapper">
                <Editor
                  height="100%"
                  language={activeFileData.language}
                  value={activeFileData.content}
                  onChange={(value) => handleEditorChange(value, activeFileData.path)}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
            )}
            
            {/* 状态栏 */}
            <div className="editor-statusbar">
              <span>{activeFileData?.language || 'Plain Text'}</span>
              <span>UTF-8</span>
              <span>{activeFileData?.isDirty ? '● 已修改' : '✓ 已保存'}</span>
              <span>{openFiles.length} 个文件已打开</span>
            </div>
          </>
        ) : (
          <div className="no-file">
            <div className="no-file-icon">📝</div>
            <h3>未打开文件</h3>
            <p>从左侧文件浏览器选择一个文件打开</p>
            <button onClick={handleOpenProject}>打开项目</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPanel;
