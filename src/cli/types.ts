export type IterReturn = { [key: string]: any };

export type CliConfig = {
  includeDir: string;
  routeAddFctName?: string;
};

export type SourceList = {
  params: string[];
  query: string[];
  body: string[];
  header: string[];
  bestEffort: string[];
};

export type ApiWitchRouteMeta = {
  path: string;
  method: string;
  auth: boolean;
  variableName: string; //the name of the exported variable so we know how to import
};

export type ApiWitchRouteExport = {
  srcPath: string;
  meta: ApiWitchRouteMeta;
};

export enum CommentInputSelect {
  query = 'query',
  header = 'header',
  params = 'params',
  body = 'body',
}
