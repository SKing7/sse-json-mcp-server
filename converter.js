#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

// SSE数据格式转换器
class SSEFormatConverter {
  static convertSSEData(rawSSEData, baseTimestamp = null) {
    const lines = rawSSEData.trim().split('\n');
    const result = [];
    let currentEvent = null;
    let currentData = null;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        if (currentEvent) {
          const timestamp = this.extractTimestamp(currentData, baseTimestamp);
          result.push({
            timestamp: timestamp,
            value: this.formatSSEValue(currentEvent, currentData)
          });
        }
        
        currentEvent = line.substring(6);
        currentData = null;
      } else if (line.startsWith('data:')) {
        currentData = line.substring(5);
      } else if (line.trim() === '' && currentEvent) {
        const timestamp = this.extractTimestamp(currentData, baseTimestamp);
        result.push({
          timestamp: timestamp,
          value: this.formatSSEValue(currentEvent, currentData)
        });
        currentEvent = null;
        currentData = null;
      }
    }

    if (currentEvent) {
      const timestamp = this.extractTimestamp(currentData, baseTimestamp);
      result.push({
        timestamp: timestamp,
        value: this.formatSSEValue(currentEvent, currentData)
      });
    }

    return result;
  }

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

  static formatSSEValue(event, data) {
    let result = `event:${event}\n`;
    if (data) {
      result += `data:${data}\n`;
    }
    result += '\n';
    return result;
  }

  static convertFromObject(sseObject, fallbackTimestamp = null) {
    const { event, data, timestamp, ...otherFields } = sseObject;
    
    let dataString = '';
    if (data) {
      dataString = typeof data === 'string' ? data : JSON.stringify(data);
    } else {
      dataString = JSON.stringify(otherFields);
    }

    const eventType = event || 'message';
    const finalTimestamp = timestamp || fallbackTimestamp || Date.now().toString();
    
    const result = {
      timestamp: finalTimestamp.toString(),
      value: this.formatSSEValue(eventType, dataString)
    };

    return result;
  }
}

// 命令行工具
function printUsage() {
  console.log(`
使用方法:
  node converter.js [选项]

选项:
  --raw <sse-data>     直接转换SSE数据字符串
  --file <file-path>   从文件读取SSE数据进行转换
  --object <json>      从JSON对象转换SSE数据
  --output <file>      输出文件路径 (可选，默认输出到控制台)
  --timestamp <ts>     基础时间戳 (可选)

示例:
  # 直接转换SSE数据
  node converter.js --raw "event:message\\ndata:{\\"test\\":\\"data\\"}\\n\\n"
  
  # 从文件转换
  node converter.js --file input.txt --output ../preset-data/converted.json
  
  # 从JSON对象转换
  node converter.js --object '{"event":"message","sseId":"123","content":"hello"}'
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  let rawData = null;
  let outputFile = null;
  let baseTimestamp = null;
  let isObject = false;

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--raw':
        rawData = args[++i];
        break;
      case '--file':
        const filePath = args[++i];
        try {
          rawData = readFileSync(filePath, 'utf-8');
        } catch (error) {
          console.error(`读取文件失败: ${error.message}`);
          return;
        }
        break;
      case '--object':
        rawData = args[++i];
        isObject = true;
        break;
      case '--output':
        outputFile = args[++i];
        break;
      case '--timestamp':
        baseTimestamp = args[++i];
        break;
    }
  }

  if (!rawData) {
    console.error('错误: 请提供要转换的数据');
    printUsage();
    return;
  }

  try {
    let result;
    
    if (isObject) {
      const sseObject = JSON.parse(rawData);
      result = [SSEFormatConverter.convertFromObject(sseObject, baseTimestamp)];
    } else {
      result = SSEFormatConverter.convertSSEData(rawData, baseTimestamp);
    }

    const output = JSON.stringify(result, null, 2);

    if (outputFile) {
      writeFileSync(outputFile, output);
      console.log(`转换完成! 结果已保存到: ${outputFile}`);
      console.log(`生成了 ${result.length} 个事件数据`);
    } else {
      console.log('转换结果:');
      console.log(output);
    }

  } catch (error) {
    console.error(`转换失败: ${error.message}`);
  }
}

main();
