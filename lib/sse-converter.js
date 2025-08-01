// SSE数据格式转换器 - 共享库
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