import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { PrometheusClient } from '../../src/clients/prometheus.js';

describe('PrometheusClient', () => {
  const baseURL = 'http://prometheus:9090';
  const client = new PrometheusClient(baseURL);

  beforeEach(() => {
    nock.cleanAll();
  });

  it('forwards /query requests', async () => {
    const scope = nock(baseURL)
      .get('/api/v1/query')
      .query({ query: 'up' })
      .reply(200, { status: 'success', data: {} });

    const res = await client.get('/api/v1/query', { query: 'up' });
    expect((res as any).status).toBe('success');
    scope.done();
  });

  it('applies range limit', async () => {
    const start = new Date('2020-01-01T00:00:00Z').toISOString();
    const end = new Date('2020-03-05T00:00:00Z').toISOString(); // 64 days > 31

    await expect(async () =>
      client.get('/api/v1/query_range', { query: 'up', start, end, step: '30' })
    ).rejects.toThrow(/Range window exceeds/);
  });
});

