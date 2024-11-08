export enum Framework {
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
  framework: Framework;
  frameworkConfig: FrameworkConfig;
  witchcraftRoutes: MethodHandler[];
}

// export interface RoutifyRouterCfg {
//   addRoute: (opts: {
//     method: string;
//     auth: boolean | string; //boolean = rue use default auth handler, string use route handler based on given name
//     callback: <Request, Response>(request: Request) => Promise<Response>;
//   }) => void;
// }

export type FrameworkContext = {
  init: (config: ApiwitchConfig) => void; //This MUST! be a synchronous function
  addRoute: (handler: MethodHandler) => () => void | MethodHandler; //FUnction must return a nother function that when called will only trigger the adding
};

export enum HttpMethods {
  get = 'get',
  delete = 'delete',
  patch = 'path',
  post = 'post',
}

interface CoreRequest {
  header?: Object;
  params?: Object;
  query?: Object;
  body?: Object;
  meta?: { [key: string]: any }; //user defined metadata
}

export interface MethodHandler {
  method: HttpMethods;
  path: string;
  auth?: boolean | string;
  querySelect?: string[];
  bodySelect?: string[];
  paramSelect?: string[];
  headerSelect?: string[];
  callback: (request: any) => Promise<any>;
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
}

/**
 * Note: this interface is used to find the exported API objects.
 * Please do not change the name, or if changed it must be changed in
 * the cli code also
 */
export interface ApiWitchRoute {
  method: string;
  path: string;
  auth?: boolean;
  callback: (request: any) => Promise<any>;
}
