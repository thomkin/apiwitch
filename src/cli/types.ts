export type SchemaItem = {
  identifier: string;
  type: string;
  isArray: boolean;
  isOptional?: boolean;
  parentIsArray?: boolean;

  ignore?: boolean;
};

export type Schema = {
  [key: string]: SchemaItem;
};

export type TypeConfig = {
  [key: string]: TypeConfigItem;
};

export type TypeConfigItem = {
  inputSource: { source: InputSourceEnum; params: string | null; id: string };
  pipe: string[];
  key: string;
};

export type CliConfig = {
  includeDir: string;
  routeAddFctName?: string;
  clientCopyDir?: string[];
};

export type SourceList = {
  params: string[];
  query: string[];
  body: string[];
  header: string[];
  bestEffort: string[];
};

export type ApiWitchRouteMeta = {
  endpoint: string;
  method: string;
  auth: boolean | string;
  permission?: string;
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

export enum InputSourceEnum {
  header = 'header',
  params = 'params',
  body = 'body',
  query = 'query',
}

export type ProcessTypeResult = {
  schema: Schema;
  typeConfig: TypeConfig;
  sourceList: SourceList;
};

export type TransformResult = {
  request: ProcessTypeResult;
  response: ProcessTypeResult;
  config: ApiWitchRouteExport;
};
