import axios, {AxiosHeaders, AxiosInstance} from 'axios';
import { differenceInDays, parseISO } from 'date-fns';

const DEFAULT_TIMEOUT = Number(process.env.MCP_PROXY_TIMEOUT_MS) || 30_000;
const MAX_RANGE_DAYS = Number(process.env.PROM_MAX_RANGE_DAYS) || 31;
const MAX_SAMPLES = Number(process.env.PROM_MAX_SAMPLES) || 110_000;

export class PrometheusClient {
  private http: AxiosInstance;

  constructor(private baseURL: string) {
    const headers: Record<string, string> = {};

    if (process.env.PROMETHEUS_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.PROMETHEUS_BEARER_TOKEN}`;
    } else if (process.env.PROMETHEUS_USERNAME && process.env.PROMETHEUS_PASSWORD) {
      const encoded = Buffer.from(`${process.env.PROMETHEUS_USERNAME}:${process.env.PROMETHEUS_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: DEFAULT_TIMEOUT,
      headers: headers as AxiosHeaders
    });
  }

  /**
   * Generic GET wrapper with limit validation.
   */
  async get<T = unknown>(path: string, params: Record<string, unknown>): Promise<T> {
    this.enforceLimits(path, params);

    const { data } = await this.http.get<T>(path, { params });
    return data;
  }

  private enforceLimits(path: string, params: Record<string, unknown>): void {
    if (!path.endsWith('/query_range')) return;

    const { start, end, step } = params as any;
    if (!start || !end || !step) return;

    const toDate = (v: string | number) =>
      typeof v === 'string' ? parseISO(v) : new Date(Number(v) * 1000);

    const startDate = toDate(start);
    const endDate = toDate(end);

    const rangeDays = differenceInDays(endDate, startDate);
    if (rangeDays > MAX_RANGE_DAYS) {
      const err: any = new Error(`Range window exceeds ${MAX_RANGE_DAYS} days`);
      err.status = 422;
      throw err;
    }

    if (!isNaN(Number(step))) {
      const samples = Math.ceil((endDate.getTime() - startDate.getTime()) / 1000 / Number(step));
      if (samples > MAX_SAMPLES) {
        const err: any = new Error(`Sample resolution exceeds ${MAX_SAMPLES} points`);
        err.status = 422;
        throw err;
      }
    }
  }
}

