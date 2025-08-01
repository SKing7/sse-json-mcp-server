#!/usr/bin/env node

// 简单的测试脚本，用于验证SSE格式转换功能
// 运行: node test.js

// SSE数据格式转换器 (从主文件复制)
class SSEFormatConverter {
  static convertSSEData(rawSSEData, baseTimestamp = null) {
    const lines = rawSSEData.trim().split('\n');
    const result = [];
    let currentEvent = null;
    let currentData = null;
    let currentTimestamp = baseTimestamp || Date.now().toString();

    for (const line of lines) {
      if (line.startsWith('event:')) {
        if (currentEvent) {
          result.push({
            timestamp: currentTimestamp,
            value: this.formatSSEValue(currentEvent, currentData)
          });
          currentTimestamp = (parseInt(currentTimestamp) + Math.random() * 1000 + 100).toString();
        }
        
        currentEvent = line.substring(6);
        currentData = null;
      } else if (line.startsWith('data:')) {
        currentData = line.substring(5);
      } else if (line.trim() === '' && currentEvent) {
        result.push({
          timestamp: currentTimestamp,
          value: this.formatSSEValue(currentEvent, currentData)
        });
        currentTimestamp = (parseInt(currentTimestamp) + Math.random() * 1000 + 100).toString();
        currentEvent = null;
        currentData = null;
      }
    }

    if (currentEvent) {
      result.push({
        timestamp: currentTimestamp,
        value: this.formatSSEValue(currentEvent, currentData)
      });
    }

    return result;
  }

  static formatSSEValue(event, data) {
    let result = `event:${event}\n`;
    if (data) {
      result += `data:${data}\n`;
    }
    result += '\n';
    return result;
  }

  static convertFromObject(sseObject, timestamp = null) {
    const { event, data, sseId, eventIndex, content, ...otherFields } = sseObject;
    
    let dataString = '';
    if (data) {
      dataString = typeof data === 'string' ? data : JSON.stringify(data);
    } else if (sseId || eventIndex !== undefined || content) {
      const dataObj = {
        ...(sseId && { sseId }),
        ...(eventIndex !== undefined && { eventIndex }),
        ...(content && { content }),
        ...(timestamp && { timestamp }),
        ...otherFields
      };
      dataString = JSON.stringify(dataObj);
    }

    const eventType = event || 'message';
    const result = {
      timestamp: timestamp || Date.now().toString(),
      value: this.formatSSEValue(eventType, dataString)
    };

    return result;
  }
}

// 测试用例
console.log('=== SSE格式转换器测试 ===\n');

// 测试1: 转换您提供的原始数据
console.log('测试1: 转换原始SSE数据');
const rawSSEData = `event:message
data:{"sseId":"7e054d93-bf52-418c-a71b-f6acc19b1a36","eventIndex":6,"content":"吗？或者需要我","timestamp":"1753968218605"}

`;

const converted1 = SSEFormatConverter.convertSSEData(rawSSEData, "1753968218000");
console.log('原始数据:', rawSSEData);
console.log('转换结果:', JSON.stringify(converted1, null, 2));
console.log('\n---\n');

// 测试2: 从对象转换
console.log('测试2: 从对象转换');
const sseObject = {
  event: "message",
  sseId: "7e054d93-bf52-418c-a71b-f6acc19b1a36",
  eventIndex: 6,
  content: "吗？或者需要我",
  timestamp: "1753968218605"
};

const converted2 = SSEFormatConverter.convertFromObject(sseObject, "1753968218000");
console.log('原始对象:', JSON.stringify(sseObject, null, 2));
console.log('转换结果:', JSON.stringify(converted2, null, 2));
console.log('\n---\n');

// 测试3: 多事件转换
console.log('测试3: 多事件转换');
const multipleEvents = `event:opened
data:{"sseId":"abc123","eventIndex":0,"timestamp":"1753968218000"}

event:message
data:{"sseId":"abc123","eventIndex":1,"content":"Hello World","timestamp":"1753968218500"}

event:message
data:{"sseId":"abc123","eventIndex":2,"content":"How are you?","timestamp":"1753968219000"}

event:close
data:{"eventIndex":3,"timestamp":"1753968219500"}

`;

const converted3 = SSEFormatConverter.convertSSEData(multipleEvents, "1753968218000");
console.log('多事件转换结果:');
console.log(JSON.stringify(converted3, null, 2));
console.log('\n---\n');

// 测试4: 生成完整的预设数据文件格式
console.log('测试4: 生成预设数据文件内容');
const presetData = converted3;
console.log('可直接保存到preset-data目录的JSON内容:');
console.log(JSON.stringify(presetData, null, 2));

console.log('\n=== 测试完成 ===');
console.log('您可以将上述任何转换结果保存到 preset-data/ 目录下，然后在Mock服务器中使用。');
