/**
 * 文件树组件（支持创建、重命名、删除、Git 状态）
 */

import React, { useState, useEffect, useCallback } from 'react';
import './FileTree.css';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  isExpanded?: boolean;
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | null;
}

interface FileTreeProps {
  projectPath: string;
  currentFile: string | null;
  onFileOpen: (path: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ projectPath, currentFile, onFileOpen }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [creating, setCreating] = useState<'file' | 'directory' | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  // 加载文件列表
  const loadFiles = useCallback(async (dirPath: string, isRecusive = false) => {
    if (window.mimoAPI) {
      try {
        const entries = await window.mimoAPI.file.listDir(dirPath);
        const withGitStatus = await addGitStatus(entries, dirPath);
        
        if (isRecusive) {
          // 递归加载子目录
          for (const entry of withGitStatus) {
            if (entry.isDirectory) {
              entry.children = await loadFiles(entry.path, true);
            }
          }
        }
        
        return withGitStatus;
      } catch (error) {
        console.error('Failed to load files:', error);
        return [];
      }
    }
    return [];
  }, []);

  // 添加 Git 状态
  const addGitStatus = async (entries: FileEntry[], _dirPath: string): Promise<FileEntry[]> => {
    // 如果有 git status API，可以在这里添加 Git 状态
    // 暂时返回不带 Git 状态的条目
    return entries.map(entry => ({
      ...entry,
      gitStatus: null
    }));
  };

  // 初始加载
  useEffect(() => {
    if (projectPath) {
      loadFiles(projectPath, true).then(setFiles);
    }
  }, [projectPath, loadFiles]);

  // 切换目录展开
  const toggleExpand = async (path: string, isDirectory: boolean) => {
    if (!isDirectory) return;

    setFiles(prev => {
      const updateChildren = (items: FileEntry[]): FileEntry[] => {
        return items.map(item => {
          if (item.path === path) {
            if (!item.children || item.children.length === 0) {
              // 加载子目录
              loadFiles(path, true).then(children => {
                setFiles(prev => updateChildrenInTree(prev, path, children));
              });
            }
            return { ...item, isExpanded: !item.isExpanded };
          }
          if (item.children) {
            return { ...item, children: updateChildren(item.children) };
          }
          return item;
        });
      };
      return updateChildren(prev);
    });
  };

  // 更新树中的子项
  const updateChildrenInTree = (items: FileEntry[], path: string, children: FileEntry[]): FileEntry[] => {
    return items.map(item => {
      if (item.path === path) {
        return { ...item, children };
      }
      if (item.children) {
        return { ...item, children: updateChildrenInTree(item.children, path, children) };
      }
      return item;
    });
  };

  // 创建文件/文件夹
  const handleCreate = async () => {
    if (!newName.trim()) return;

    if (window.mimoAPI) {
      try {
        const parentPath = projectPath; // 简化：总是在项目根目录创建
        const fullPath = `${parentPath}/${newName}`;

        if (creating === 'file') {
          await window.mimoAPI.file.write(fullPath, '');
        } else {
          // 创建目录（需要 API 支持）
          console.log('Create directory:', fullPath);
        }

        // 重新加载
        const updated = await loadFiles(projectPath, true);
        setFiles(updated);
        
        setCreating(null);
        setNewName('');
      } catch (error) {
        console.error('Failed to create:', error);
      }
    }
  };

  // 重命名
  const handleRename = async (oldPath: string) => {
    if (!renamingName.trim()) return;

    if (window.mimoAPI) {
      try {
        const newPath = oldPath.substring(0, oldPath.lastIndexOf('/')) + '/' + renamingName;
        // 需要 API 支持 rename
        console.log('Rename:', oldPath, '->', newPath);

        const updated = await loadFiles(projectPath, true);
        setFiles(updated);
        
        setRenamingPath(null);
        setRenamingName('');
      } catch (error) {
        console.error('Failed to rename:', error);
      }
    }
  };

  // 删除
  const handleDelete = async (filePath: string) => {
    const confirm = window.confirm(`确定要删除 ${filePath.split('/').pop()} 吗？`);
    if (!confirm || !projectPath) return;

    if (window.mimoAPI) {
      try {
        await window.mimoAPI.file.delete(filePath);

        const updated = await loadFiles(projectPath, true);
        setFiles(updated);
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  // 获取 Git 状态图标
  const getGitStatusIcon = (status: string | null) => {
    switch (status) {
      case 'modified': return <span className="git-status modified" title="已修改">M</span>;
      case 'added': return <span className="git-status added" title="已添加">A</span>;
      case 'deleted': return <span className="git-status deleted" title="已删除">D</span>;
      case 'untracked': return <span className="git-status untracked" title="未跟踪">?</span>;
      default: return null;
    }
  };

  // 获取文件图标
  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx': return '📜';
      case 'ts':
      case 'tsx': return '📘';
      case 'json': return '📋';
      case 'css':
      case 'scss': return '🎨';
      case 'html': return '🌐';
      case 'md': return '📝';
      case 'py': return '🐍';
      default: return '📄';
    }
  };

  // 渲染文件树
  const renderTree = (items: FileEntry[], depth = 0): JSX.Element[] => {
    return items.map((item) => (
      <div key={item.path}>
        <div
          className={`tree-item ${currentFile === item.path ? 'active' : ''} ${item.isDirectory ? 'directory' : 'file'}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (item.isDirectory) {
              toggleExpand(item.path, true);
            } else {
              onFileOpen(item.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            // 右键菜单：重命名、删除
            const action = window.prompt('输入操作 (rename/delete):');
            if (action === 'rename') {
              setRenamingPath(item.path);
              setRenamingName(item.name);
            } else if (action === 'delete') {
              handleDelete(item.path);
            }
          }}
        >
          {item.isDirectory && (
            <span className="expand-icon">
              {item.isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="item-icon">
            {getFileIcon(item.name, item.isDirectory)}
          </span>
          {renamingPath === item.path ? (
            <input
              className="rename-input"
              value={renamingName}
              onChange={(e) => setRenamingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(item.path);
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              autoFocus
            />
          ) : (
            <span className="item-name">{item.name}</span>
          )}
          {getGitStatusIcon(item.gitStatus || null)}
        </div>
        {item.isDirectory && item.isExpanded && item.children && (
          <div className="tree-children">
            {renderTree(item.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="file-tree">
      <div className="tree-header">
        <span>文件浏览器</span>
        <div className="tree-actions">
          <button
            onClick={() => { setCreating('file'); setNewName(''); }}
            title="新建文件"
          >+</button>
          <button
            onClick={() => { setCreating('directory'); setNewName(''); }}
            title="新建文件夹"
          >📁</button>
          <button
            onClick={() => loadFiles(projectPath, true).then(setFiles)}
            title="刷新"
          >↻</button>
        </div>
      </div>

      {/* 创建输入框 */}
      {creating && (
        <div className="create-input">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setCreating(null); setNewName(''); }
            }}
            placeholder={creating === 'file' ? '文件名...' : '文件夹名...'}
            autoFocus
          />
        </div>
      )}

      {/* 文件树 */}
      <div className="tree-content">
        {files.length === 0 ? (
          <div className="tree-empty">
            <p>暂无文件</p>
          </div>
        ) : (
          renderTree(files)
        )}
      </div>
    </div>
  );
};

export default FileTree;
