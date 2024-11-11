//TODO: check that we can remove ths it seems redudnate
// to property list
export type IterItem = {
  [key: string]: {
    name?: string; //TODO: make this required !!!!
    type: string;
    required: boolean;
  };
};

export type SchemaItem = {
  name: string;
  type: string;
  required: boolean;
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
  // sourceList: SourceList;
  pipe: string[];
  key: string;
};

// export type ParserReturn = {
//   typeObject: IterReturn;
//   typeConfig: TypeConfigItem[];
// };

export type IterReturn = { [key: string]: IterItem };

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
  auth: boolean | string;
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
