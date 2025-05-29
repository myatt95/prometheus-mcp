import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {PrometheusClient} from "./clients/prometheus";


export class PrometheusMcpServer {

    private readonly server: McpServer;
    private readonly client: PrometheusClient;

    constructor(client: PrometheusClient) {
        this.server = new McpServer({
            name: "mcp-prometheus",
            version: "1.0.0"
        });

        this.client = client;
        this.initTools();
    }

    initTools() {
        this.server.tool(
            "query",
            {
                query: z.string().describe("PromQL expression string to evaluate"),
                time: z.string().optional().describe("Evaluation timestamp (RFC3339 or unix epoch)"),
                timeout: z.string().optional().describe("Evaluation timeout (`duration` format, e.g. 30s)"),
                limit: z.number().int().nonnegative().optional().describe("Maximum number of returned series (0 = disabled)")
            },
            async ({ query, time, timeout, limit }) => {
                try {
                    const data = await this.client.get('/api/v1/query', { query, time, timeout, limit })
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

        this.server.tool(
            "query_range",
            {
                query: z.string().describe("PromQL expression to execute over the range"),
                start: z.string().describe("Range start time (RFC3339 or unix epoch)"),
                end:   z.string().describe("Range end time (RFC3339 or unix epoch)"),
                step:  z.string().describe("Query resolution step width (`duration`, e.g. `30s`, or number of seconds)"),
                timeout: z.string().optional().describe("Maximum evaluation time before the query is aborted"),
                limit:   z.number().int().nonnegative().optional().describe("Maximum number of returned series (0 = disabled)")
            },
            async ({ query, start, end, step, timeout, limit }) => {
                try {
                    const data = await this.client.get('/api/v1/query_range', { query, start, end, step, timeout, limit })
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

        this.server.tool(
            "series",
            {
                start: z.string().optional().describe("Optional range start time (RFC3339 or unix epoch)"),
                end:   z.string().optional().describe("Optional range end time (RFC3339 or unix epoch)"),
                match: z.array(z.string()).min(1).describe("One or more match[] selectors (e.g. `up`, `{job=\"api\"}`)"),
                limit: z.number().int().nonnegative().optional().describe("Maximum number of series to return")
            },
            async ({ match, start, end, limit }) => {
                const params: Record<string, unknown> = { start, end, limit };
                params["match[]"] = match;
                const data = await this.client.get("/api/v1/series", params);
                return { content: [{ type: "text", text: JSON.stringify(data) }] };
            }
        )

        this.server.tool(
            "labels",
            {
                start: z.string().optional().describe("Optional range start time used to filter labels"),
                end:   z.string().optional().describe("Optional range end time used to filter labels"),
                match: z.array(z.string()).optional().describe("match[] selectors used to filter labels"),
                limit: z.number().int().nonnegative().optional().describe("Maximum number of label names to return")
            },
            async ({ start, end, match, limit }) => {
                const params: Record<string, unknown> = { start, end, limit };
                if (match) params["match[]"] = match;
                const data = await this.client.get("/api/v1/labels", params);
                return { content: [{ type: "text", text: JSON.stringify(data) }] };
            }
        )

        this.server.tool(
            "label_values",
            {
                name: z.string().describe("Label name to fetch values for"),
                start: z.string().optional().describe("Optional range start time used to filter values"),
                end:   z.string().optional().describe("Optional range end time used to filter values"),
                match: z.array(z.string()).optional().describe("match[] selectors used to filter label values"),
                limit: z.number().int().nonnegative().optional().describe("Maximum number of values to return")
            },
            async ({ name, start, end, match, limit }) => {
                const params: Record<string, unknown> = { start, end, limit };
                if (match) params["match[]"] = match;
                const data = await this.client.get(`/api/v1/label/${encodeURIComponent(name)}/values`, params);
                return { content: [{ type: "text", text: JSON.stringify(data) }] };
            }
        )

        this.server.tool(
            "targets",
            {
                state: z.enum(["active", "dropped", "any"]).optional().describe("Filter by target state"),
                scrapePool: z.string().optional().describe("Filter by scrape pool name")
            },
            async ({ state, scrapePool }) => {
                const data = await this.client.get("/api/v1/targets", { state, scrapePool });
                return { content: [{ type: "text", text: JSON.stringify(data) }] };
            }
        )

        this.server.tool(
            "metadata",
            {
                match_target: z.union([z.string(), z.array(z.string())]).optional().describe("Label selectors that match targets by their label sets. Selects all targets if omitted."),
                metric: z.string().optional().describe("Metric name to retrieve metadata for. Retrieves all metric metadata if omitted."),
                limit: z.number().int().nonnegative().optional().describe("Maximum number of targets to match")
            },
            async ({ match_target, metric, limit }) => {
                const params: Record<string, unknown> = { metric, limit };
                if (match_target !== undefined) params["match_target"] = match_target;
                const data = await this.client.get("/api/v1/metadata", params);
                return { content: [{ type: "text", text: JSON.stringify(data) }] };
            }
        )

        this.server.tool(
            "health",
            {},
            async () => {
                return { content: [{ type: 'text', text: 'ok' }] }
            }
        )
    }

    getServer() {
        return this.server;
    }

}







