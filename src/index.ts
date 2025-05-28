import dotenv from 'dotenv'
dotenv.config()

import { z } from 'zod'
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrometheusClient } from './clients/prometheus.js'

const promURL = process.env.PROMETHEUS_BASE_URL || 'http://localhost:9090'
const client = new PrometheusClient(promURL)

const server = new McpServer({
    name: "mcp-prometheus",
    version: "1.0.0"
});

server.tool(
    "query",
    z.object({
      query: z.string().describe("PromQL expression string to evaluate"),
      time: z.string().optional().describe("Evaluation timestamp (RFC3339 or unix epoch)"),
      timeout: z.string().optional().describe("Evaluation timeout (`duration` format, e.g. 30s)"),
      limit: z.number().int().nonnegative().optional().describe("Maximum number of returned series (0 = disabled)")
    }),
    async ({ query, time, timeout, limit }) => {
        try {
            const data = await client.get('/api/v1/query', { query, time, timeout, limit })
            return { content: [{ type: 'text', text: JSON.stringify(data) }] }
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: `Error: ${err instanceof Error ? err.message : String(err)}`
                }]
            }
        }
    }
)

server.tool(
    "query_range",
    z.object({
      query: z.string(),
      start: z.string(),
      end: z.string(),
      step: z.string().describe("Resolution step width (`duration` or seconds)"),
      timeout: z.string().optional(),
      limit: z.number().int().nonnegative().optional()
    }),
    async ({ query, start, end, step, timeout, limit }) => {
        try {
            const data = await client.get('/api/v1/query_range', { query, start, end, step, timeout, limit })
            return { content: [{ type: 'text', text: JSON.stringify(data) }] }
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: `Error: ${err instanceof Error ? err.message : String(err)}`
                }]
            }
        }
    }
)

server.tool(
    "series",
    z.object({
      match: z.array(z.string()).min(1).describe("One or more series selectors (PromQL match[])"),
      start: z.string().optional(),
      end: z.string().optional(),
      limit: z.number().int().nonnegative().optional()
    }),
    async ({ match, start, end, limit }) => {
      const params: Record<string, unknown> = { start, end, limit };
      params["match[]"] = match;
      const data = await client.get("/api/v1/series", params);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
)

server.tool(
    "labels",
    z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      match: z.array(z.string()).optional().describe("Series selectors used to filter labels"),
      limit: z.number().int().nonnegative().optional()
    }),
    async ({ start, end, match, limit }) => {
      const params: Record<string, unknown> = { start, end, limit };
      if (match) params["match[]"] = match;
      const data = await client.get("/api/v1/labels", params);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
)

server.tool(
    "label_values",
    z.object({
      name: z.string().describe("Label name to fetch values for"),
      start: z.string().optional(),
      end: z.string().optional(),
      match: z.array(z.string()).optional(),
      limit: z.number().int().nonnegative().optional()
    }),
    async ({ name, start, end, match, limit }) => {
      const params: Record<string, unknown> = { start, end, limit };
      if (match) params["match[]"] = match;
      const data = await client.get(`/api/v1/label/${encodeURIComponent(name)}/values`, params);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
)

server.tool(
    "targets",
    z.object({
      state: z.enum(["active", "dropped", "any"]).optional().describe("Filter by target state"),
      scrapePool: z.string().optional().describe("Filter by scrape pool name")
    }),
    async ({ state, scrapePool }) => {
      const data = await client.get("/api/v1/targets", { state, scrapePool });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
)

server.tool(
    "metadata",
    z.object({
      metric: z.string().optional().describe("Metric name to retrieve metadata for"),
      limit: z.number().int().nonnegative().optional().describe("Maximum number of metrics to return"),
      limit_per_metric: z.number().int().nonnegative().optional().describe("Maximum metadata objects per metric")
    }),
    async ({ metric, limit, limit_per_metric }) => {
      const data = await client.get("/api/v1/metadata", { metric, limit, limit_per_metric });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
)

server.tool(
    "health",
    {},
    async () => {
        return { content: [{ type: 'text', text: 'ok' }] }
    }
)

const transport = new StdioServerTransport();
await server.connect(transport).then(() => {
    console.log('Server started');
});