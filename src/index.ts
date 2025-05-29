import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrometheusClient } from './clients/prometheus.js'
import {PrometheusMcpServer} from "./mcp";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp";

dotenv.config()

const promURL = process.env.PROMETHEUS_BASE_URL || 'http://localhost:9090'
const client = new PrometheusClient(promURL)

const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.

    try {
        const prometheusMcpServer = new PrometheusMcpServer(client)
        const server = prometheusMcpServer.getServer();

        const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });

        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});

app.get('/mcp', async (_, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});

app.delete('/mcp', async (_, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});


/* If not HTTP mode: come back to this and refactor
const transport = new StdioServerTransport();
await server.connect(transport).then(() => {
    console.log('Server started');
});
*/

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});