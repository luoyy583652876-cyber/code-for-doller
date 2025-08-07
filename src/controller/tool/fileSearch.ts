import { Controller, Get, Query, HttpCode, HttpStatus } from '@midwayjs/core';
import { IsString, IsBoolean, IsOptional } from 'class-validator'; // 仅保留这行
import * as fs from 'fs/promises';
import * as path from 'path';
import { App } from '@midwayjs/core';

// 添加DTO进行参数验证
class SearchFilesDTO {
  @IsString()
  directory: string;

  @IsBoolean()
  @IsOptional()
  recursive: boolean = true;
}

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

@Controller('/tool/file-search')
export class FileSearchController {
  @App()
  app: any;

  /**
   * Search files in the specified directory
   * @param directory - The directory path to search
   * @param recursive - Whether to search recursively (default: true)
   * @returns Array of file information objects
   */
  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async searchFiles(@Query() query: SearchFilesDTO): Promise<{ files: FileInfo[], error?: string }> {
    try {
      // 安全检查：限制只能搜索项目内目录
      const rootDir = this.app.getBaseDir();
      const fullDirPath = path.resolve(query.directory);

      if (!fullDirPath.startsWith(rootDir)) {
        return { files: [], error: 'Access denied: Can only search directories within the project' };
      }

      // 验证目录是否存在
      const stats = await fs.stat(fullDirPath);
      if (!stats.isDirectory()) {
        return { files: [], error: 'Provided path is not a directory' };
      }

      const files = await this.traverseDirectory(fullDirPath, query.recursive);
      return { files };
    } catch (error) {
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotFoundError':
            return { files: [], error: 'Directory not found' };
          case 'PermissionError':
            return { files: [], error: 'Permission denied to access directory' };
          default:
            return { files: [], error: `Search failed: ${error.message}` };
        }
      }
      return { files: [], error: 'An unknown error occurred during search' };
    }
  }

  /**
   * Recursively traverse directory and collect file information
   */
  private async traverseDirectory(
    dirPath: string,
    recursive: boolean,
    results: FileInfo[] = []
  ): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        const fileInfo: FileInfo = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modifiedTime: stats.mtime
        };

        results.push(fileInfo);

        // 如果需要递归且是目录，继续遍历
        if (recursive && entry.isDirectory()) {
          await this.traverseDirectory(fullPath, recursive, results);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Failed to traverse directory ${dirPath}: ${error.message}`);
      }
    }

    return results;
  }
}