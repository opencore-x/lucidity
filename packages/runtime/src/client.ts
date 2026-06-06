export interface ApiClientConfig {
  /** Base URL, e.g. `http://localhost:3001` or `https://api.lucidity.my`. */
  apiUrl: string;
  /** Lucidity API key (`luc_…`), sent as `Authorization: Bearer`. */
  apiKey: string;
}

export interface ApiClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

/**
 * Minimal authenticated fetch wrapper for the Lucidity REST API. Mirrors
 * `packages/mcp-server/src/client.ts` but takes config explicitly instead of
 * reading/exiting on env at import time — the daemon supplies credentials from
 * `~/.lucidity/config.json`.
 */
export function createApiClient({ apiUrl, apiKey }: ApiClientConfig): ApiClient {
  const base = apiUrl.replace(/\/+$/, '');

  return {
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const response = await fetch(`${base}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        let message: string;
        try {
          const json = JSON.parse(body);
          message = json.error || json.message || body;
        } catch {
          message = body || `HTTP ${response.status}`;
        }
        throw new Error(`API error (${response.status}): ${message}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    },
  };
}
