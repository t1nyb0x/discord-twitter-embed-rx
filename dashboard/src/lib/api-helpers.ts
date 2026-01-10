interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * API レスポンスを作成
 * P1対応: Cache-Control: no-store を強制
 */
export function createApiResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify({ success: true, data } as ApiResponse<T>), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * API エラーレスポンスを作成
 * P1対応: Cache-Control: no-store を強制
 */
export function createApiError(code: string, message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
    } as ApiError),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * レート制限エラーを作成
 */
export function createRateLimitError(resetAt: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "レート制限に達しました。しばらくしてから再度お試しください。",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil(resetAt - Date.now() / 1000).toString(),
        "Cache-Control": "no-store",
      },
    }
  );
}
