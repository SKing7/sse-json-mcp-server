#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SSEFormatConverter } from "./lib/sse-converter.js";

const server = new Server(
  {
    name: "sse-format-converter",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "convert_sse_data",
        description: "将原始SSE数据流转换为项目所需的格式",
        inputSchema: {
          type: "object",
          properties: {
            rawData: {
              type: "string",
              description:
                '原始SSE数据字符串，例如: "event:message\\ndata:{\\"sseId\\":\\"123\\"}\\n\\n"',
            },
            baseTimestamp: {
              type: "string",
              description: "基础时间戳，可选，默认使用当前时间",
            },
            format: {
              type: "string",
              enum: ["single", "multiple", "object"],
              description:
                "数据格式类型：single(单个事件), multiple(多个事件), object(JSON对象)",
            },
          },
          required: ["rawData"],
        },
      },
      {
        name: "convert_sse_object",
        description: "将SSE数据对象转换为项目格式",
        inputSchema: {
          type: "object",
          properties: {
            sseObject: {
              type: "object",
              description: "SSE数据对象，包含event, data, sseId等字段",
            },
            timestamp: {
              type: "string",
              description: "时间戳，可选",
            },
          },
          required: ["sseObject"],
        },
      },
      {
        name: "generate_preset_data",
        description: "生成预设数据文件内容",
        inputSchema: {
          type: "object",
          properties: {
            sseDataArray: {
              type: "array",
              items: {
                type: "object",
              },
              description: "转换后的SSE数据数组",
            },
            filename: {
              type: "string",
              description: "生成的文件名",
            },
          },
          required: ["sseDataArray"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "convert_sse_data": {
      const { rawData, baseTimestamp, format = "single" } = args;

      try {
        let result;

        switch (format) {
          case "multiple":
            result = SSEFormatConverter.convertMultipleSSEEvents(
              rawData,
              baseTimestamp
            );
            break;
          case "object":
            try {
              const parsed = JSON.parse(rawData);
              result = [
                SSEFormatConverter.convertFromObject(parsed, baseTimestamp),
              ];
            } catch (e) {
              throw new Error("无效的JSON对象格式");
            }
            break;
          default:
            result = SSEFormatConverter.convertSSEData(rawData, baseTimestamp);
        }

        return {
          content: [
            {
              type: "text",
              text: `转换成功！生成了 ${
                result.length
              } 个事件数据。\n\n转换结果：\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `转换失败: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "convert_sse_object": {
      const { sseObject, timestamp } = args;

      try {
        const result = SSEFormatConverter.convertFromObject(
          sseObject,
          timestamp
        );

        return {
          content: [
            {
              type: "text",
              text: `对象转换成功！\n\n转换结果：\n${JSON.stringify(
                result,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `对象转换失败: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "generate_preset_data": {
      const { sseDataArray, filename = "converted-data.json" } = args;

      try {
        const jsonContent = JSON.stringify(sseDataArray, null, 2);

        return {
          content: [
            {
              type: "text",
              text: `预设数据文件内容生成成功！文件名: ${filename}\n\n文件内容：\n${jsonContent}\n\n您可以将此内容保存到 preset-data/${filename} 文件中。`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `生成预设数据失败: ${error.message}`,
            },
          ],
          isError: true,
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
  console.error("SSE格式转换MCP服务器已启动");
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
