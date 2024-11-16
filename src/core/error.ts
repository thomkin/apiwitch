export enum CoreErrorCodes {
  AuthHandlerAlreadyExists = 1000,
  NoAuthHandlerDefined = 1001,
  ValidationFailed = 1002,
  AuthenticationFailed = 1003,

  //RPC Related codes
  RpcPacketMalformed = 1004,
  RpcAuthNotExists = 1005,
  RpcAuthNotAllowed = 1006,
  RpcEndpointDoesNotExist = 1007,

  //client codes
  ConnectionRefused = 1500,
  NoTokenFound = 1501,
}

export enum HttpErrorCode {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  PreconditionFailed = 412,
  RequestEntityTooLarge = 413,
  UnsupportedMediaType = 415,
  RequestedRangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  Teapot = 418,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  UnorderedCollection = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HTTPVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

export type HttpErrorMsg = {
  code?: number | string;
  message: any;
};

export class CoreError extends Error {
  constructor(errorCode: CoreErrorCodes, message: any) {
    if (typeof message === 'object') {
      super(JSON.stringify(message));
    } else {
      super(message);
    }
  }
}
