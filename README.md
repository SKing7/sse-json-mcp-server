# SSE格式转换MCP服务器

这个MCP服务器可以将原始的SSE数据流转换为您项目所需的格式。

## 安装和启动

1. 安装依赖：
```bash
cd mcp-server
npm install
```

2. 启动MCP服务器：
```bash
npm start
```

## 功能

### 1. convert_sse_data
将原始SSE数据流转换为项目格式。

**示例输入：**
```
rawData: "event:message\ndata:{\"sseId\":\"7e054d93-bf52-418c-a71b-f6acc19b1a36\",\"eventIndex\":6,\"content\":\"吗？或者需要我\",\"timestamp\":\"1753968218605\"}\n\n"
baseTimestamp: "1753968218000" (可选)
format: "single" (single/multiple/object)
```

**输出格式：**
```json
[
  {
    "timestamp": "1753968218000",
    "value": "event:message\ndata:{\"sseId\":\"7e054d93-bf52-418c-a71b-f6acc19b1a36\",\"eventIndex\":6,\"content\":\"吗？或者需要我\",\"timestamp\":\"1753968218605\"}\n\n"
  }
]
```

### 2. convert_sse_object
将SSE数据对象转换为项目格式。

**示例输入：**
```json
{
  "sseObject": {
    "event": "message",
    "sseId": "7e054d93-bf52-418c-a71b-f6acc19b1a36",
    "eventIndex": 6,
    "content": "吗？或者需要我",
    "timestamp": "1753968218605"
  },
  "timestamp": "1753968218000"
}
```

### 3. generate_preset_data
生成可直接用于项目的预设数据文件。

## 使用示例

### 转换您提供的原始数据

您的原始数据：
```
event:message
data:{"sseId":"7e054d93-bf52-418c-a71b-f6acc19b1a36","eventIndex":6,"content":"吗？或者需要我","timestamp":"1753968218605"}
```

转换后的格式：
```json
[
  {
    "timestamp": "1753968218000",
    "value": "event:message\ndata:{\"sseId\":\"7e054d93-bf52-418c-a71b-f6acc19b1a36\",\"eventIndex\":6,\"content\":\"吗？或者需要我\",\"timestamp\":\"1753968218605\"}\n\n"
  }
]
```

### 批量转换多个事件

如果您有多个SSE事件，可以使用 `format: "multiple"` 参数：

```
event:opened
data:{"sseId":"abc","eventIndex":0}

event:message
data:{"sseId":"abc","eventIndex":1,"content":"Hello"}

event:close
data:{"eventIndex":2}
```

### 在Claude Desktop中使用

在Claude Desktop的配置文件中添加这个MCP服务器：

```json
{
  "mcpServers": {
    "sse-converter": {
      "command": "node",
      "args": ["/path/to/your/mcp-server/index.js"]
    }
  }
}
```

然后在对话中可以这样使用：

"请使用 convert_sse_data 工具转换这个SSE数据：event:message\ndata:{\"sseId\":\"123\",\"content\":\"test\"}"

## 集成到项目

转换后的数据可以直接保存到您的 `preset-data/` 目录下，然后在Mock服务器中使用。

例如，将转换结果保存为 `preset-data/converted-data.json`，然后在前端选择这个预设数据文件即可。
# sse-json-mcp-server
