import { Controller, Get, HttpCode, HttpStatus } from '@midwayjs/core';
import { Context } from '@midwayjs/web';
import { Readable } from 'stream';

/**
 * MCP控制器 - 提供工具初始化、列表接口和SSE长连接
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean; description?: string }>;
}

@Controller('/mcp')
export class MCPPController {
  /**
   * 初始化接口 - 返回可用工具列表
   */
  @Get('/initialize')
  @HttpCode(HttpStatus.OK)
  async initialize(ctx: Context) {
    // 定义工具列表，包含file_searcher工具的详细参数信息
    const tools: ToolDefinition[] = [
      {
        name: 'file_searcher',
        description: 'Search files in the specified directory with optional recursive search',
        parameters: {
          directory: {
            type: 'string',
            required: true,
            description: 'The directory path to search (absolute path within project)'
          },
          recursive: {
            type: 'boolean',
            required: false,
            description: 'Whether to search recursively (default: true)'
          }
        }
      }
      // 可以在这里添加更多工具定义
    ];

    // 返回工具列表和初始化状态
    return {
      status: 'success',
      message: 'MCP initialized successfully',
      tools,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取工具列表接口 - 单独提供工具列表查询
   */
  @Get('/tools')
  @HttpCode(HttpStatus.OK)
  async getTools() {
    // 实际项目中可以考虑将工具定义抽离到单独的配置文件或服务中
    const tools: ToolDefinition[] = [
      {
        name: 'file_searcher',
        description: 'Search files in the specified directory with optional recursive search',
        parameters: {
          directory: {
            type: 'string',
            required: true,
            description: 'The directory path to search (absolute path within project)'
          },
          recursive: {
            type: 'boolean',
            required: false,
            description: 'Whether to search recursively (default: true)'
          }
        }
      }
    ];

    return {
      tools,
      count: tools.length
    };
  }

  /**
   * SSE长连接接口 - 实时推送事件
   */
  @Get('/sse')
  async sse(ctx: Context) {
    // 设置SSE响应头
    const response = ctx.response;
    response.set('Content-Type', 'text/event-stream');
    response.set('Cache-Control', 'no-cache');
    response.set('Connection', 'keep-alive');
    response.set('Access-Control-Allow-Origin', '*');

    // 创建可读流
    const stream = new Readable({
      read() {}
    });

    // 客户端断开连接时清理
    ctx.req.on('close', () => {
      stream.push(null); // 结束流
      stream.destroy();
    });

    // 发送连接成功事件
    stream.push(`data: ${JSON.stringify({ event: 'connected', message: 'SSE connection established' })}

`);

    // 定期发送心跳包 (每30秒)
    const heartbeatInterval = setInterval(() => {
      stream.push(`data: ${JSON.stringify({ event: 'heartbeat', timestamp: new Date().toISOString() })}

`);
    }, 30000);

    // 模拟工具事件推送 (实际项目中应替换为真实事件触发)
    setTimeout(() => {
      stream.push(`data: ${JSON.stringify({
        event: 'tool_update',
        tool: 'file_searcher',
        status: 'ready'
      })}

`);
    }, 5000);

    // 清理定时器
    stream.on('close', () => {
      clearInterval(heartbeatInterval);
    });

    return stream;
  }
}