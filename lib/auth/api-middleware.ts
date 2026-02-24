import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export interface AuthResult {
  user: {
    id: string;
    email: string;
  };
  employee: Employee;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Get Supabase client for server-side with user's access token
 */
function getSupabaseClientWithAuth(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AuthError("Server configuration error", 500);
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extract access token from request
 */
function extractAccessToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie as fallback (for browser requests)
  const cookies = request.cookies;
  const accessToken = cookies.get("sb-access-token")?.value;
  if (accessToken) {
    return accessToken;
  }

  return null;
}

/**
 * Require authenticated user
 * Returns the authenticated user and their employee record
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const accessToken = extractAccessToken(request);

  if (!accessToken) {
    throw new AuthError("กรุณาเข้าสู่ระบบก่อนใช้งาน");
  }

  const supabase = getSupabaseClientWithAuth(accessToken);

  // Verify the token and get user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  // Get employee record
  const { data: employeeData, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .single();

  if (employeeError || !employeeData) {
    throw new AuthError("ไม่พบข้อมูลพนักงาน", 403);
  }

  const employee = employeeData as Employee;

  // Check if account is deleted
  if (employee.deleted_at) {
    throw new AuthError("บัญชีของคุณถูกลบออกจากระบบแล้ว", 403);
  }

  // Check if account is active
  if (employee.account_status !== "approved") {
    throw new AuthError("บัญชีของคุณยังไม่ได้รับการอนุมัติ", 403);
  }

  return {
    user: {
      id: user.id,
      email: user.email || "",
    },
    employee,
  };
}

/**
 * Require admin or supervisor role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!["admin", "supervisor"].includes(authResult.employee.role)) {
    throw new AuthError("คุณไม่มีสิทธิ์เข้าถึงส่วนนี้", 403);
  }

  return authResult;
}

/**
 * Require strictly admin role (no supervisor)
 */
export async function requireStrictAdmin(
  request: NextRequest
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (authResult.employee.role !== "admin") {
    throw new AuthError("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถใช้งานส่วนนี้ได้", 403);
  }

  return authResult;
}

/**
 * Verify that the authenticated user owns the resource
 */
export function verifyOwnership(
  authResult: AuthResult,
  resourceOwnerId: string
): void {
  // Admins and supervisors can access any resource
  if (["admin", "supervisor"].includes(authResult.employee.role)) {
    return;
  }

  // Regular users can only access their own resources
  if (authResult.user.id !== resourceOwnerId) {
    throw new AuthError("คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้", 403);
  }
}

/**
 * Handle auth errors and return appropriate response
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Unexpected auth error:", error);
  return Response.json(
    { error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" },
    { status: 500 }
  );
}

/**
 * Wrapper for API handlers that require authentication
 * Usage:
 * export const POST = withAuth(async (request, auth) => {
 *   // auth.user and auth.employee are available
 * });
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    let auth: AuthResult;
    try {
      auth = await requireAuth(request);
    } catch (error) {
      return handleAuthError(error);
    }
    try {
      return await handler(request, auth);
    } catch (err) {
      console.error("Unhandled API error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Wrapper for API handlers that require admin role
 */
export function withAdmin(
  handler: (request: NextRequest, auth: AuthResult) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    let auth: AuthResult;
    try {
      auth = await requireAdmin(request);
    } catch (error) {
      return handleAuthError(error);
    }
    try {
      return await handler(request, auth);
    } catch (err) {
      console.error("Unhandled API error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Wrapper for API handlers that require strict admin role
 */
export function withStrictAdmin(
  handler: (request: NextRequest, auth: AuthResult) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    let auth: AuthResult;
    try {
      auth = await requireStrictAdmin(request);
    } catch (error) {
      return handleAuthError(error);
    }
    try {
      return await handler(request, auth);
    } catch (err) {
      console.error("Unhandled API error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
