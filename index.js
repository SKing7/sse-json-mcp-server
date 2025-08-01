#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'sse-format-converter',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// SSE数据格式转换器
export class SSEFormatConverter {
  /**
   * 将原始SSE数据转换为项目格式
   * @param {string} rawSSEData - 原始SSE数据字符串
   * @param {string} baseTimestamp - 基础时间戳（仅在data中没有timestamp时使用）
   * @returns {Array} 转换后的数据数组
   */
  static convertSSEData(rawSSEData, baseTimestamp = null) {
    const lines = rawSSEData.trim().split('\n');
    const result = [];
    let currentEvent = null;
    let currentData = null;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        // 如果有之前的事件，先保存
        if (currentEvent) {
          const timestamp = this.extractTimestamp(currentData, baseTimestamp);
          result.push({
            timestamp: timestamp,
            value: this.formatSSEValue(currentEvent, currentData)
          });
        }
        
        currentEvent = line.substring(6); // 移除 'event:' 前缀
        currentData = null;
      } else if (line.startsWith('data:')) {
        currentData = line.substring(5); // 移除 'data:' 前缀
      } else if (line.trim() === '' && currentEvent) {
        // 空行表示事件结束
        const timestamp = this.extractTimestamp(currentData, baseTimestamp);
        result.push({
          timestamp: timestamp,
          value: this.formatSSEValue(currentEvent, currentData)
        });
        currentEvent = null;
        currentData = null;
      }
    }

    // 处理最后一个事件
    if (currentEvent) {
      const timestamp = this.extractTimestamp(currentData, baseTimestamp);
      result.push({
        timestamp: timestamp,
        value: this.formatSSEValue(currentEvent, currentData)
      });
    }

    return result;
  }

  /**
   * 从data中提取timestamp
   * @param {string} data - data字段内容
   * @param {string} fallbackTimestamp - 备用时间戳
   * @returns {string} 提取的时间戳
   */
  static extractTimestamp(data, fallbackTimestamp = null) {
    if (!data) {
      return fallbackTimestamp || Date.now().toString();
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.timestamp) {
        return parsed.timestamp.toString();
      }
    } catch (e) {
      // 如果不是JSON格式，忽略错误
    }

    return fallbackTimestamp || Date.now().toString();
  }

  /**
   * 格式化SSE值为项目所需格式
   * @param {string} event - 事件类型
   * @param {string} data - 数据内容
   * @returns {string} 格式化后的SSE值
   */
  static formatSSEValue(event, data) {
    let result = `event:${event}\n`;
    if (data) {
      result += `data:${data}\n`;
    }
    result += '\n';
    return result;
  }

  /**
   * 批量转换多个SSE事件
   * @param {string} multipleSSEData - 包含多个SSE事件的字符串
   * @param {string} baseTimestamp - 基础时间戳（仅在data中没有timestamp时使用）
   * @returns {Array} 转换后的数据数组
   */
  static convertMultipleSSEEvents(multipleSSEData, baseTimestamp = null) {
    // 直接处理整个数据流，不需要分割
    return this.convertSSEData(multipleSSEData, baseTimestamp);
  }

  /**
   * 从JSON对象转换SSE数据
   * @param {Object} sseObject - SSE数据对象，包含event和data字段
   * @param {string} fallbackTimestamp - 备用时间戳
   * @returns {Object} 项目格式的数据对象
   */
  static convertFromObject(sseObject, fallbackTimestamp = null) {
    const { event, data, timestamp, ...otherFields } = sseObject;
    
    let dataString = '';
    if (data) {
      dataString = typeof data === 'string' ? data : JSON.stringify(data);
    } else {
      // 构建数据对象，包含所有其他字段
      dataString = JSON.stringify(otherFields);
    }

    const eventType = event || 'message';
    // 优先使用对象中的timestamp，其次使用fallbackTimestamp
    const finalTimestamp = timestamp || fallbackTimestamp || Date.now().toString();
    
    const result = {
      timestamp: finalTimestamp.toString(),
      value: this.formatSSEValue(eventType, dataString)
    };

    return result;
  }
}

// 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'convert_sse_data',
        description: '将原始SSE数据流转换为项目所需的格式',
        inputSchema: {
          type: 'object',
          properties: {
            rawData: {
              type: 'string',
              description: '原始SSE数据字符串，例如: "event:message\\ndata:{\\"sseId\\":\\"123\\"}\\n\\n"'
            },
            baseTimestamp: {
              type: 'string',
              description: '基础时间戳，可选，默认使用当前时间'
            },
            format: {
              type: 'string',
              enum: ['single', 'multiple', 'object'],
              description: '数据格式类型：single(单个事件), multiple(多个事件), object(JSON对象)'
            }
          },
          required: ['rawData']
        }
      },
      {
        name: 'convert_sse_object',
        description: '将SSE数据对象转换为项目格式',
        inputSchema: {
          type: 'object',
          properties: {
            sseObject: {
              type: 'object',
              description: 'SSE数据对象，包含event, data, sseId等字段'
            },
            timestamp: {
              type: 'string',
              description: '时间戳，可选'
            }
          },
          required: ['sseObject']
        }
      },
      {
        name: 'generate_preset_data',
        description: '生成预设数据文件内容',
        inputSchema: {
          type: 'object',
          properties: {
            sseDataArray: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: '转换后的SSE数据数组'
            },
            filename: {
              type: 'string',
              description: '生成的文件名'
            }
          },
          required: ['sseDataArray']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'convert_sse_data': {
      const { rawData, baseTimestamp, format = 'single' } = args;
      
      try {
        let result;
        
        switch (format) {
          case 'multiple':
            result = SSEFormatConverter.convertMultipleSSEEvents(rawData, baseTimestamp);
            break;
          case 'object':
            try {
              const parsed = JSON.parse(rawData);
              result = [SSEFormatConverter.convertFromObject(parsed, baseTimestamp)];
            } catch (e) {
              throw new Error('无效的JSON对象格式');
            }
            break;
          default:
            result = SSEFormatConverter.convertSSEData(rawData, baseTimestamp);
        }

        return {
          content: [
            {
              type: 'text',
              text: `转换成功！生成了 ${result.length} 个事件数据。\n\n转换结果：\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `转换失败: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }

    case 'convert_sse_object': {
      const { sseObject, timestamp } = args;
      
      try {
        const result = SSEFormatConverter.convertFromObject(sseObject, timestamp);
        
        return {
          content: [
            {
              type: 'text',
              text: `对象转换成功！\n\n转换结果：\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `对象转换失败: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }

    case 'generate_preset_data': {
      const { sseDataArray, filename = 'converted-data.json' } = args;
      
      try {
        const jsonContent = JSON.stringify(sseDataArray, null, 2);
        
        return {
          content: [
            {
              type: 'text',
              text: `预设数据文件内容生成成功！文件名: ${filename}\n\n文件内容：\n${jsonContent}\n\n您可以将此内容保存到 preset-data/${filename} 文件中。`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `生成预设数据失败: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }

    default:
      throw new Error(`未知工具: ${name}`);
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SSE格式转换MCP服务器已启动');
}

main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});
