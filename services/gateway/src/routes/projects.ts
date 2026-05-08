/**
 * Gateway Service - 项目路由 (使用数据库持久化)
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import ProjectService from '../services/project.service';

const router = Router();

// 创建项目
router.post('/', apiKeyAuth, asyncHandler(async (req, res) => {
  const { name, path } = req.body;
  
  if (!name || !path) {
    throw new ApiError(400, 'name and path are required');
  }
  
  const project = await ProjectService.createProject({ name, path });
  
  logger.info('Project created', { projectId: project.id, name });
  
  res.status(201).json({
    success: true,
    data: project
  });
}));

// 获取项目列表
router.get('/', apiKeyAuth, asyncHandler(async (req, res) => {
  const projects = await ProjectService.getProjects();
  
  res.json({
    success: true,
    data: projects
  });
}));

// 获取单个项目
router.get('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const project = await ProjectService.getProject(req.params.id);
  
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  
  res.json({
    success: true,
    data: project
  });
}));

// 根据路径获取项目
router.get('/path/:path(*)', apiKeyAuth, asyncHandler(async (req, res) => {
  const project = await ProjectService.getProjectByPath(req.params.path);
  
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  
  res.json({
    success: true,
    data: project
  });
}));

// 更新项目
router.patch('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const { name, path } = req.body;
  
  const project = await ProjectService.updateProject(req.params.id, { name, path });
  
  res.json({
    success: true,
    data: project
  });
}));

// 删除项目
router.delete('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  await ProjectService.deleteProject(req.params.id);
  
  logger.info('Project deleted', { projectId: req.params.id });
  
  res.json({
    success: true,
    message: 'Project deleted'
  });
}));

// 添加项目文件
router.post('/:id/files', apiKeyAuth, asyncHandler(async (req, res) => {
  const { path, content } = req.body;
  
  if (!path) {
    throw new ApiError(400, 'path is required');
  }
  
  const file = await ProjectService.addFile({
    projectId: req.params.id,
    path,
    content
  });
  
  res.json({
    success: true,
    data: file
  });
}));

// 获取项目文件
router.get('/:id/files/:path(*)', apiKeyAuth, asyncHandler(async (req, res) => {
  const file = await ProjectService.getFile(req.params.id, req.params.path);
  
  if (!file) {
    throw new ApiError(404, 'File not found');
  }
  
  res.json({
    success: true,
    data: file
  });
}));

// 删除项目文件
router.delete('/:id/files/:path(*)', apiKeyAuth, asyncHandler(async (req, res) => {
  await ProjectService.deleteFile(req.params.id, req.params.path);
  
  res.json({
    success: true,
    message: 'File deleted'
  });
}));

export default router;
