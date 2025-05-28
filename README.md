# Prometheus MCP Server (TypeScript)

Expose the Prometheus HTTP API v2 as Model Context Protocol operations so an LLM can query metrics directly.

## Quick‑start

```bash
docker compose up --build
```

## Environment Variables

Name | Purpose | Default
---- | -------- | -------
PROMETHEUS_BASE_URL | Prometheus HTTP endpoint | http://localhost:9090
MCP_PORT | Port for the MCP server | 8080
MCP_PROXY_TIMEOUT_MS | Upstream query timeout | 30000
PROM_MAX_RANGE_DAYS | Max query_range window | 31
PROM_MAX_SAMPLES | Max samples returned | 110000

## License

TBD

