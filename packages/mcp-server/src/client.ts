const API_KEY = process.env['LUCIDITY_API_KEY'];
const API_URL = process.env['LUCIDITY_API_URL'] || 'https://api.lucidity.my';

if (!API_KEY) {
  console.error(
    'LUCIDITY_API_KEY environment variable is required.\n' +
      'Generate one in Lucidity app: Settings → API Key → Generate.',
  );
  process.exit(1);
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
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
}
