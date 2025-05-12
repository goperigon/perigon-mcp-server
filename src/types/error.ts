export class HttpError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(statusCode: number, responseBody: string, message?: string) {
    super(message || `Request failed with status: ${statusCode}`);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.name = "HttpError";

    // This is needed for proper instanceof checks in TypeScript
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
