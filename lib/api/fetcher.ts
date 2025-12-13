// lib/api/fetcher.ts
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error ?? 'REQUEST_FAILED', res.status, data);
  }

  return data as T;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error ?? 'REQUEST_FAILED', res.status, data);
  }

  return data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error ?? 'REQUEST_FAILED', res.status, data);
  }

  return data as T;
}
