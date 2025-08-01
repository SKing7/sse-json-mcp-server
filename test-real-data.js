#!/usr/bin/env node

// 使用真实数据测试修复后的SSE转换器
import { SSEFormatConverter } from './index.js';

console.log('=== 真实数据测试 ===\n');

// 你提供的真实SSE数据
const realSSEData = `event:opened
data:{"querySentenceId":"2fda5ef7-cf01-42be-987f-da8105451041","timestamp":"1754018498163","turnId":"c2470163-dc3a-4316-864d-4753e69677f1","eventIndex":0,"answerSentenceId":"39514260-5f87-4b50-a4c8-c35214c20802","conversationId":"82acccaa-c435-45c3-bfaa-9b07c32eadef","sseId":"6a4ceace-dba1-4c8b-a21e-f090fdf39a19","queryTime":"2025-08-01T11:21:38.142042587"}

event:onlineSearch
data:{"eventIndex":1,"content":{"details":[{"stage":"thoughtDetail","title":"这是个信息检索与事实核验领域的新闻事件追踪任务，我需要联网搜索最新信息。","content":"这是个信息检索与事实核验领域的新闻事件追踪任务，我需要联网搜索最新信息。","icon":"","url":"","toolName":null}]}}

event:onlineSearch
data:{"eventIndex":2,"content":{"details":[{"stage":"search","title":"正在联网搜索","content":"","icon":"","url":"","toolName":null}]}}

event:webSearch
data:{"sub_type":"webSearch","eventIndex":4,"type":"ClientEvent","content":"全网收集资料中"}

event:ping

event:refHostName
data:{"sseId":"6a4ceace-dba1-4c8b-a21e-f090fdf39a19","eventIndex":6,"content":{"refHostName":[{"index":"1","hostName":"新浪网"},{"index":"2","hostName":"山东中公教育"}]}}

`;

try {
  const converted = SSEFormatConverter.convertSSEData(realSSEData);
  
  console.log('转换结果:');
  console.log(JSON.stringify(converted, null, 2));
  
  console.log('\n=== 验证时间戳提取 ===');
  converted.forEach((item, index) => {
    console.log(`事件 ${index + 1}: timestamp = ${item.timestamp}`);
  });
  
} catch (error) {
  console.error('转换失败:', error.message);
}