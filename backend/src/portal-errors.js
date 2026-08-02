export class PortalError extends Error {
  constructor(statusCode, code, publicMessage, details) {
    super(publicMessage);
    this.name = "PortalError";
    this.statusCode = statusCode;
    this.code = code;
    this.publicMessage = publicMessage;
    if (details !== undefined) this.details = details;
  }
}

export function portalFail(statusCode, code, message, details) {
  throw new PortalError(statusCode, code, message, details);
}
