import { IterReturn } from '../cli/types';
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
  witchcraftSchemas: { [key: string]: any };
}

export type FrameworkContext = {
  //This MUST! be a synchronous function
  init: (config: ApiwitchConfig) => void;

  //Function must return another function that when called will only trigger the adding
  addRoute: (
    handler: MethodHandler,
    witchcraftSchemas: { [key: string]: any },
  ) => () => void | MethodHandler;
};

export enum HttpMethods {
  get = 'get',
  delete = 'delete',
  patch = 'patch',
  post = 'post',
}

export interface MethodHandler {
  method: HttpMethods;
  path: string;
  auth?: boolean | string;
  uuid: string;
  querySelect?: string[];
  bodySelect?: string[];
  paramSelect?: string[];
  headerSelect?: string[];
  bestEffortSelect?: string[];
  callback: (input: {
    request: any;
    error: (code: number, message: string) => void;
    redirect: (url: string, status: 301 | 302 | 303 | 307 | 308 | undefined) => void;
    meta: { [key: string]: any };
  }) => Promise<any>;
}

export interface AutoGenMethodData {
  importPath: string;
  method: HttpMethods;
  callback: string;
  path: string;
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
  method: string;
  path: string;
  auth?: boolean | string;

  callback: (request: any) => Promise<any>;
}

export type AuthReturn = {
  error?: HttpErrorMsg;
  meta?: { [key: string]: any };
};

export type AuthHandler = (authorization: string | undefined) => AuthReturn;
export type AuthHandlerMap = Map<string, AuthHandler>;
