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

export interface RoutyfastConfig {
  framework: Framework;
  frameworkConfig: FrameworkConfig;
}

// export interface RoutifyRouterCfg {
//   addRoute: (opts: {
//     method: string;
//     auth: boolean | string; //boolean = rue use default auth handler, string use route handler based on given name
//     callback: <Request, Response>(request: Request) => Promise<Response>;
//   }) => void;
// }

export type FrameworkContext = {
  init: (config: RoutyfastConfig) => void; //This MUST! be a synchronous function
  addRoute: (handler: MethodHandler) => () => void; //FUnction must return a nother function that when called will only trigger the adding
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
