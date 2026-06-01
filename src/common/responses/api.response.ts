export class ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly message: string;
  readonly timestamp: string;

  constructor(data: T | null, message = 'Success', success = true) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(data, message, true);
  }

  static error<T>(message: string): ApiResponse<T> {
    return new ApiResponse<T>(null, message, false);
  }
}