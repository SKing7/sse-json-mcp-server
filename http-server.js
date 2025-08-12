#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { SSEFormatConverter } from './lib/sse-converter.js';

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sse-converter', version: '1.0.0' });
});

// 获取所有可用的转换功能
app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'convert_sse_data',
        description: '将原始SSE数据流转换为项目所需的格式',
        endpoint: '/api/convert/sse-data',
        method: 'POST',
        parameters: {
          rawData: { type: 'string', required: true, description: '原始SSE数据字符串' },
          baseTimestamp: { type: 'string', required: false, description: '基础时间戳，可选' },
          format: { type: 'string', required: false, enum: ['single', 'multiple', 'object'], description: '数据格式类型' }
        }
      },
      {
        name: 'convert_sse_object',
        description: '将SSE数据对象转换为项目格式',
        endpoint: '/api/convert/sse-object',
        method: 'POST',
        parameters: {
          sseObject: { type: 'object', required: true, description: 'SSE数据对象' },
          timestamp: { type: 'string', required: false, description: '时间戳，可选' }
        }
      },
      {
        name: 'generate_preset_data',
        description: '生成预设数据文件内容',
        endpoint: '/api/generate/preset-data',
        method: 'POST',
        parameters: {
          sseDataArray: { type: 'array', required: true, description: '转换后的SSE数据数组' },
          filename: { type: 'string', required: false, description: '生成的文件名' }
        }
      }
    ]
  });
});

// 转换SSE数据
app.post('/api/convert/sse-data', (req, res) => {
  try {
    const { rawData, baseTimestamp, format = 'single' } = req.body;
    
    if (!rawData) {
      return res.status(400).json({ 
        error: 'Missing required parameter: rawData',
        success: false 
      });
    }

    let actualRawData = rawData;
    
    console.log('接收到的rawData:', typeof rawData, rawData);
    
    // 检测n8n模板变量未解析的情况
    if (typeof rawData === 'string' && (rawData.includes('{{ $json.sseData }}') || rawData === '{{ $json.sseData }}')) {
      return res.status(400).json({ 
        error: 'n8n模板变量未正确解析。请检查n8n HTTP节点的JSON Body配置，确保使用表达式语法: ={"rawData": $json.sseData, "format": "single"}',
        success: false,
        rawDataReceived: rawData
      });
    }
    
    // 处理n8n可能发送的数据格式
    if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].sseData) {
      // n8n发送的是数组格式，提取sseData字段
      actualRawData = rawData[0].sseData;
      console.log('检测到n8n数组格式，提取sseData字段');
    } else if (typeof rawData === 'object' && rawData.sseData) {
      // n8n发送的是对象格式，提取sseData字段
      actualRawData = rawData.sseData;
      console.log('检测到n8n对象格式，提取sseData字段');
    } else if (typeof rawData !== 'string') {
      // 如果不是字符串且不是期望的格式，尝试转换为字符串
      actualRawData = String(rawData);
      console.log('将非字符串数据转换为字符串');
    }

    console.log(`处理SSE数据，长度: ${actualRawData.length}`);
    
    let result;

    switch (format) {
      case 'multiple':
        result = SSEFormatConverter.convertMultipleSSEEvents(actualRawData, baseTimestamp);
        break;
      case 'object':
        try {
          const parsed = JSON.parse(actualRawData);
          result = [SSEFormatConverter.convertFromObject(parsed, baseTimestamp)];
        } catch (e) {
          return res.status(400).json({ 
            error: '无效的JSON对象格式',
            success: false 
          });
        }
        break;
      default:
        result = SSEFormatConverter.convertSSEData(actualRawData, baseTimestamp);
    }

    res.json({
      success: true,
      data: result,
      count: result.length,
      format: format,
      message: `Successfully converted ${result.length} SSE events`
    });

  } catch (error) {
    console.error('转换SSE数据时出错:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 转换SSE对象
app.post('/api/convert/sse-object', (req, res) => {
  try {
    const { sseObject, timestamp } = req.body;
    
    if (!sseObject) {
      return res.status(400).json({ 
        error: 'Missing required parameter: sseObject',
        success: false 
      });
    }

    const result = SSEFormatConverter.convertFromObject(sseObject, timestamp);

    res.json({
      success: true,
      data: result,
      message: 'Successfully converted SSE object'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 生成预设数据
app.post('/api/generate/preset-data', (req, res) => {
  try {
    const { sseDataArray, filename = 'converted-data.json' } = req.body;
    
    if (!sseDataArray || !Array.isArray(sseDataArray)) {
      return res.status(400).json({ 
        error: 'Missing required parameter: sseDataArray (must be an array)',
        success: false 
      });
    }

    const jsonContent = JSON.stringify(sseDataArray, null, 2);

    res.json({
      success: true,
      data: {
        filename: filename,
        content: jsonContent,
        itemCount: sseDataArray.length
      },
      message: `Successfully generated preset data file with ${sseDataArray.length} items`
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 批量转换 - 便于n8n工作流使用
app.post('/api/convert/batch', (req, res) => {
  try {
    const { items, baseTimestamp, format = 'single' } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'Missing required parameter: items (must be an array)',
        success: false 
      });
    }

    const results = [];
    const errors = [];

    items.forEach((item, index) => {
      try {
        let result;
        
        if (typeof item === 'string') {
          // 处理原始SSE字符串
          result = SSEFormatConverter.convertSSEData(item, baseTimestamp);
        } else if (typeof item === 'object') {
          // 处理SSE对象
          result = [SSEFormatConverter.convertFromObject(item, baseTimestamp)];
        } else {
          throw new Error('Item must be a string or object');
        }
        
        results.push(...result);
      } catch (error) {
        errors.push({
          index: index,
          item: item,
          error: error.message
        });
      }
    });

    res.json({
      success: errors.length === 0,
      data: results,
      totalItems: items.length,
      successCount: results.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${items.length} items, ${results.length} successful conversions`
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/tools',
      'POST /api/convert/sse-data',
      'POST /api/convert/sse-object',
      'POST /api/generate/preset-data',
      'POST /api/convert/batch'
    ]
  });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
  console.log(`SSE Converter HTTP API Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API documentation: http://localhost:${port}/api/tools`);
});

export default app;
