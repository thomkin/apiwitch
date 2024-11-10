export type IterItem = {
  [key: string]: {
    name?: string; //TODO: make this required !!!!
    type: string;
    required: boolean;
  };
};

export type PropertyListItem = {
  name: string;
  type: string;
  required: boolean;
  ignore?: boolean;
};

export type PropertyList = {
  [key: string]: PropertyListItem;
};

export type TypeConfig = {
  [key: string]: {
    inputSource: { source: InputSourceEnum; params: string | null };
    sourceList: SourceList;
    pipe: string[];
  };
};

export type ParserReturn = {
  typeObject: IterReturn;
  typeConfig: CommentConfigItem[];
};

export type IterReturn = { [key: string]: IterItem };
// export type IterReturn = { [key: string]: any };

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
export type CommentConfigItem = {
  inputSource: { source: InputSourceEnum; params: string | null };
  sourceList: SourceList;
  pipe: string[];
  key: string;
};

export type ProcessTypeResult = {
  propertyList: PropertyList;
  typeConfig: TypeConfig;
};

export type TransformResult = {
  request: ProcessTypeResult;
  response: ProcessTypeResult;
  config: ApiWitchRouteExport;
};
