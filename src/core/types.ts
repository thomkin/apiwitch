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
  witchcraftRoutes: MethodHandler[];
  authHandlerMap: AuthHandlerMap;
}

export type FrameworkContext = {
  //This MUST! be a synchronous function
  init: (config: ApiwitchConfig) => void;

  //Function must return another function that when called will only trigger the adding
  addRoute: (handler: MethodHandler) => () => void | MethodHandler;

  //can be called by core to return an error, we have to see how this would work with different frameworks though, focusing elysia first
  // error: (code: number, message: string) => void;
  // addAuthHandler: (authorization: string) => boolean; //authorization is the data form Authorization header
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
  querySelect?: string[];
  bodySelect?: string[];
  paramSelect?: string[];
  headerSelect?: string[];
  bestEffortSelect?: string[];
  callback: (
    request: any,
    error: (code: number, message: string) => void,
    redirect: (url: string, status: 301 | 302 | 303 | 307 | 308 | undefined) => void,
  ) => Promise<any>;
}

export interface AutoGenMethodData {
  importPath: string;
  method: HttpMethods;
  callback: string;
  path: string;
  auth?: boolean | string;
  querySelect?: string[];
  bodySelect?: string[];
  paramSelect?: string[];
  headerSelect?: string[];
  bestEffortSelect?: string[];
  requestTypeString: string;
  responseTypeString: string;
  rawSchemaRequest: IterReturn;
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

export type AuthHandler = (authorization: string | undefined) => HttpErrorMsg | undefined;
export type AuthHandlerMap = Map<string, AuthHandler>;
