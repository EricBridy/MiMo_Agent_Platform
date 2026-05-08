import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreateProjectData {
  name: string;
  path: string;
}

export interface CreateProjectFileData {
  projectId: string;
  path: string;
  content?: string;
}

export class ProjectService {
  // 创建项目
  static async createProject(data: CreateProjectData) {
    try {
      const project = await prisma.project.create({
        data: {
          name: data.name,
          path: data.path,
        },
      });
      logger.info(`Project created: ${project.id}`);
      return project;
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  }

  // 获取项目列表
  static async getProjects() {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { lastOpened: 'desc' },
        include: {
          _count: {
            select: { files: true },
          },
        },
      });
      return projects;
    } catch (error) {
      logger.error('Failed to get projects:', error);
      throw error;
    }
  }

  // 获取单个项目
  static async getProject(id: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          files: true,
        },
      });
      return project;
    } catch (error) {
      logger.error('Failed to get project:', error);
      throw error;
    }
  }

  // 根据路径获取项目
  static async getProjectByPath(path: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { path },
        include: {
          files: true,
        },
      });
      return project;
    } catch (error) {
      logger.error('Failed to get project by path:', error);
      throw error;
    }
  }

  // 更新项目
  static async updateProject(id: string, data: Partial<CreateProjectData>) {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...data,
          lastOpened: new Date(),
        },
      });
      logger.info(`Project updated: ${id}`);
      return project;
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  }

  // 删除项目
  static async deleteProject(id: string) {
    try {
      await prisma.project.delete({
        where: { id },
      });
      logger.info(`Project deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  }

  // 添加项目文件
  static async addFile(data: CreateProjectFileData) {
    try {
      const file = await prisma.projectFile.upsert({
        where: {
          projectId_path: {
            projectId: data.projectId,
            path: data.path,
          },
        },
        update: {
          content: data.content,
          modified: new Date(),
        },
        create: {
          projectId: data.projectId,
          path: data.path,
          content: data.content,
        },
      });
      return file;
    } catch (error) {
      logger.error('Failed to add project file:', error);
      throw error;
    }
  }

  // 获取项目文件
  static async getFile(projectId: string, path: string) {
    try {
      const file = await prisma.projectFile.findUnique({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
      });
      return file;
    } catch (error) {
      logger.error('Failed to get project file:', error);
      throw error;
    }
  }

  // 删除项目文件
  static async deleteFile(projectId: string, path: string) {
    try {
      await prisma.projectFile.delete({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
      });
      logger.info(`Project file deleted: ${path}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete project file:', error);
      throw error;
    }
  }
}

export default ProjectService;
