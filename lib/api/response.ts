import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL";

type ApiErrorBody = {
  ok: false;
  error: { code: ApiErrorCode; message?: string; details?: unknown };
};

type ApiSuccessBody<T> = { ok: true; data: T };

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccessBody<T>>({ ok: true, data }, init);
}

export function apiError(
  code: ApiErrorCode,
  status: number,
  message?: string,
  details?: unknown,
  init?: ResponseInit
) {
  const body: ApiErrorBody = { ok: false, error: { code, message, details } };
  return NextResponse.json(body, { ...init, status });
}
