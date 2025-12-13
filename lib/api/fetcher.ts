// lib/api/fetcher.ts
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  data?: unknown;

  constructor(opts: {
    code: string;
    status: number;
    message?: string;
    details?: unknown;
    data?: unknown;
  }) {
    super(opts.message ?? opts.code);
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.data = opts.data;
  }
}

type ApiOk<T> = { ok: true; data: T };
type ApiKo = { ok: false; error: { code: string; message?: string; details?: unknown } };
type ApiResponse<T> = ApiOk<T> | ApiKo;

function assertApiEnvelope(x: any): x is { ok: boolean } {
  return x && typeof x === 'object' && typeof x.ok === 'boolean';
}

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);

  // Si la route ne respecte pas le contrat, tu le vois tout de suite
  if (!assertApiEnvelope(json)) {
    throw new ApiError({
      code: 'INVALID_API_RESPONSE',
      status: res.status,
      message: 'API response is not normalized (missing { ok })',
      data: json,
    });
  }

  if (json.ok) {
    return (json as ApiOk<T>).data;
  }

  const err = (json as ApiKo).error;
  throw new ApiError({
    code: err.code ?? 'REQUEST_FAILED',
    status: res.status,
    message: err.message,
    details: err.details,
    data: json,
  });
}

export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  return parseApiResponse<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseApiResponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return parseApiResponse<T>(res);
}
