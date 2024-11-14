import { Context, Cookie } from 'elysia';
import { HttpErrorMsg } from './error';

export enum FrameworkId {
  'elysia' = 'elysia',
}

interface Cors {
  origins?: string[];
  methods?: string[];
  allowedHeaders?: string[];
}

interface Swagger {
  path: string;
}

export interface FrameworkConfig {
  cors: Cors;
  port: number;
  swagger?: Swagger;
}

export interface ApiwitchConfig {
  frameworkId: FrameworkId;
  frameworkConfig: FrameworkConfig;
  authHandlerMap: AuthHandlerMap;
  witchcraftRoutes: MethodHandler[];
  witchcraftSchemas: WitchcraftSchemasType;
  rpcConfig: RpcConfig;
}

export type RpcConfig = {
  enable: boolean;
  path: string;
};
export type RpcRouteHandler = (input: RpcRouteRequest) => Promise<any>;

export type RpcRouteRequest = {
  request: RpcRequest<any>;
  error: (code: number, message: string) => void;
  witchcraftSchemas: { [key: string]: any };
};

export type FrameworkContext = {
  //This MUST! be a synchronous function
  init: (config: ApiwitchConfig) => void;

  //Function must return another function that when called will only trigger the adding
  addRoute: (
    handler: MethodHandler,
    witchcraftSchemas: { [key: string]: any },
  ) => () => void | MethodHandler;

  rpcRoute: (
    path: string,
    callback: RpcRouteHandler,
    witchcraftSchemas: { [key: string]: any },
  ) => void;
};

export enum ApiMethods {
  get = 'get',
  delete = 'delete',
  patch = 'patch',
  post = 'post',
  rpc = 'rpc',
}

export type MethodHandler = {
  method: ApiMethods;
  endpoint: string; //path for http | method for rpc
  auth: string;
  uuid: string;
  querySelect?: string[];
  bodySelect?: string[];
  paramSelect?: string[];
  headerSelect?: string[];
  bestEffortSelect?: string[];
  callback: (input: {
    request: any;
    error: (code: number, message: string) => void;
    redirect?: (url: string, status: 301 | 302 | 303 | 307 | 308 | undefined) => void;
    cookie?: Record<string, Cookie<string | undefined>>;
    meta: { [key: string]: any };
  }) => Promise<any | RpcReturn<any>>;
};

export interface AutoGenMethodData {
  importPath: string;
  method: ApiMethods;
  callback: string;
  endpoint: string;
  auth?: boolean | string;
  querySelect: string[];
  bodySelect: string[];
  paramSelect: string[];
  headerSelect: string[];
  bestEffortSelect: string[];
  uuid: string;
}

/**
 * Note: this interface is used to find the exported API objects.
 * Please do not change the name, or if changed it must be changed in
 * the cli code also
 */
export interface ApiWitchRoute {
  method: 'get' | 'post' | 'delete' | 'patch' | 'rpc';
  endpoint: string;
  auth?: string;
  callback: ApiWitchRouteHandler;
}

export type AuthReturn = {
  error?: HttpErrorMsg;
  meta?: { [key: string]: any };
};

export type AuthHandler = (authorization: string | undefined) => Promise<AuthReturn>;
export type AuthHandlerMap = Map<string, AuthHandler>;

export type WitchcraftSchemasType = { [key: string]: any };
export type ApiWitchRouteInput<req> = {
  request: req;
  cookie: Record<string, Cookie<string | undefined>>;
  error: (code: number, message: string) => any;
  redirect: (url: string, status: 301 | 302 | 303 | 307 | 308 | undefined) => any;
  meta: { [key: string]: any };
};

export type ApiWitchRouteHandler = (input: ApiWitchRouteInput<any>) => Promise<any>;

export type RpcRequest<T> = {
  id: number;
  endpoint: string;
  authorization: string; //format similar to HTTP auth header --> Basic|Bearer token
  params: T;
};

export interface RpcHandlerInput {
  request: RpcRequest<any>;
  witchcraftSchemas: { [key: string]: any };
  uuid: string;
  context: Context;
}

export type RpcReturn<T> = {
  result?: T; //data depending on the request made
  error?: {
    appCode: number; //an application error code that could be used to query more information about the error
    message: string; //a short message should not be too long
  };
};

export type RpcResponse<T> = {
  id: number; //the id from the request would not be needed for HTTP but might be needed for PubSub
  result?: T; //data depending on the request made
  error?: {
    appCode: number; //an application error code that could be used to query more information about the error
    message: string; //a short message should not be too long
  };
};

export type WitchcraftRoute = {};
