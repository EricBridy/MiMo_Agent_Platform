/**
 * 代码编辑器面板
 */

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store';
import './EditorPanel.css';

const EditorPanel: React.FC = () => {
  const { currentProjectPath, setCurrentProjectPath } = useStore();
  const [files, setFiles] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  
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
  
  // 打开文件
  const handleOpenFile = async (path: string) => {
    if (window.mimoAPI) {
      try {
        const content = await window.mimoAPI.file.read(path);
        setCurrentFile(path);
        setFileContent(content);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };
  
  // 保存文件
  const handleSaveFile = async () => {
    if (window.mimoAPI && currentFile) {
      try {
        await window.mimoAPI.file.write(currentFile, fileContent);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    }
  };
  
  // 内容变化
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
      setIsDirty(true);
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
  }, [currentFile, fileContent]);
  
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
      {/* 文件浏览器 */}
      <div className="file-explorer">
        <div className="explorer-header">
          <span>文件浏览器</span>
          <button onClick={handleOpenProject}>📂 打开</button>
        </div>
        
        {currentProjectPath && (
          <div className="project-path">
            📁 {currentProjectPath}
          </div>
        )}
        
        <div className="file-tree">
          {files.length === 0 ? (
            <div className="empty-tree">
              <p>暂无文件</p>
              <button onClick={handleOpenProject}>打开项目文件夹</button>
            </div>
          ) : (
            files.map((file, index) => (
              <div
                key={index}
                className={`file-item ${file.isDirectory ? 'directory' : 'file'}`}
                onClick={() => !file.isDirectory && handleOpenFile(file.path)}
              >
                <span className="file-icon">
                  {getFileIcon(file.name, file.isDirectory)}
                </span>
                <span className="file-name">{file.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* 编辑器区域 */}
      <div className="editor-container">
        {currentFile ? (
          <>
            <div className="editor-tabs">
              <div className="tab active">
                <span>{currentFile.split(/[/\\]/).pop()}</span>
                {isDirty && <span className="dirty-dot">●</span>}
              </div>
            </div>
            <div className="editor-wrapper">
              <Editor
                height="100%"
                language="typescript"
                value={fileContent}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2
                }}
              />
            </div>
            <div className="editor-statusbar">
              <span>UTF-8</span>
              <span>TypeScript</span>
              <span>{isDirty ? '● 已修改' : '✓ 已保存'}</span>
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
