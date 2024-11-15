export enum AuthType {
  bearer = 'Bearer',
  basic = 'Basic',
}

export enum ClientErrorCodes {
  ConnectionRefused = 0,

  NoTokenFound = 4000,
}

export interface KyError {
  errno: number;
  code: string;
  path: string;
}

export type AuthCredentials = {
  authType: AuthType;
  token: string; //token in case of bearer base64 username:password string for baisc auth
};

export type AuthCredentialsStore = { [key: string]: AuthCredentials };

export type ClientConfig = {
  baseUrl: string;
  authCredentials: AuthCredentialsStore;
};

export type KyReturn<response> = {
  error?: {
    code: number;
    message: string;
  };
  data?: response | undefined;
};

export type RpcResponse<T> = {
  id: number; //the id from the request would not be needed for HTTP but might be needed for PubSub
  result?: T; //data depending on the request made
  error?: {
    appCode: number; //an application error code that could be used to query more information about the error
    message: string; //a short message should not be too long
  };
};

export type RpcRequest<T> = {
  id: number;
  endpoint: string;
  authorization: string; //format similar to HTTP auth header --> Basic|Bearer token
  params: T;
};
