export interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export interface PerformanceSegments {
  auth: number;
  validation: number;
  business: number;
  database: number;
  total: number;
}
