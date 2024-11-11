import { logger, ErrorCode } from './logger';
import { cliConfig } from './index';
import { AstParser } from './ast';
import { cwd } from 'process';
import path from 'path';

import {
  ApiWitchRouteExport,
  ApiWitchRouteMeta,
  ProcessTypeResult,
  SourceList,
  TransformResult,
  TypeConfig,
} from './types';

import {
  Project,
  SourceFile,
  TypeAliasDeclaration,
  InterfaceDeclaration,
  SyntaxKind,
  VariableDeclaration,
} from 'ts-morph';

const processTypeOrInterface = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration | undefined,
  keyPrepend: string,
): ProcessTypeResult | undefined | null => {
  if (typeDeclaration) {
    const astParser = new AstParser();

    //Type configuration contains meta information encoded in the block comment of the type
    const typeConfigArr = astParser.parseTypeConfigFromComment(typeDeclaration, keyPrepend);

    //This object contains a schema for all properties defined on the type
    const schema = astParser.getSchemaFromTypeDeclaration(typeDeclaration, keyPrepend);

    const typeConfig: TypeConfig = {};

    typeConfigArr?.forEach((tc, idx) => {
      typeConfig[tc.key] = {
        key: tc.key,
        inputSource: typeConfigArr[idx].inputSource,
        pipe: typeConfigArr[idx].pipe,
      };
    });

    const sourceList: SourceList = {
      bestEffort: [],
      body: [],
      header: [],
      params: [],
      query: [],
    };

    //The schema contains a proper list of all variable names. We should use that
    //iterate over it and find the corresponding
    Object.keys(schema).forEach((key) => {
      const cfg = typeConfigArr?.find((cfg) => cfg.key === key);

      if (cfg) {
        sourceList[cfg.inputSource.source].push(cfg.inputSource.id);
      } else {
        //stip the top level name --> nmame of the type itself (request / response)
        const newKey = key.replace(keyPrepend, '').replace(/^\./, '');
        sourceList.bestEffort.push(newKey);
      }
    });

    return {
      schema: schema,
      typeConfig: typeConfig,
      sourceList: sourceList,
    };
  }
  return;
};

const apiWitchRouteMetaData = (
  dec: VariableDeclaration | undefined,
): { method: string; path: string; auth: boolean | string } => {
  const paList = dec?.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
  const ret: { method: string; path: string; auth: boolean | string } = {
    method: 'undefined',
    path: 'undefined',
    auth: true,
  } as any;

  paList?.forEach((pa) => {
    const key = pa.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
    const value = pa.getFirstChildByKind(SyntaxKind.StringLiteral)?.getText();

    if (key === 'method') {
      ret.method = value?.slice(1, value.length - 1) || 'undefined';
    } else if (key === 'path') {
      ret.path = value?.slice(1, value.length - 1) || 'undefined';
    } else if (key == 'auth') {
      if (value) {
        ret.auth = value?.slice(1, value.length - 1);
      } else {
        const value = pa.getFirstChildByKind(SyntaxKind.TrueKeyword)?.getText();
        ret.auth = value === 'true' ? true : false;
      }
    }
  });

  return ret;
};

const findApiWitchExportedRoutes = (src: SourceFile): ApiWitchRouteExport | undefined => {
  const meta: ApiWitchRouteMeta = {} as ApiWitchRouteMeta;
  const variableStatements = src.getChildrenOfKind(SyntaxKind.VariableStatement);

  if (variableStatements?.length === 0) {
    return;
  }

  let hasExportedWitchRoute = false;
  for (let i = 0; i < variableStatements.length; i++) {
    const varStatement = variableStatements[i];

    //Check if the variable definition is eported if not we do not need to continue
    const isExported = varStatement.getFirstModifierByKind(SyntaxKind.ExportKeyword) ? true : false;
    if (!isExported) {
      continue;
    }

    const typeRef = varStatement.getFirstDescendantByKind(SyntaxKind.TypeReference)?.getText();
    const hasTypeApiWitchRoute = typeRef === cliConfig.routeAddFctName;

    if (!hasTypeApiWitchRoute) {
      continue;
    }

    meta.variableName =
      varStatement
        .getFirstDescendantByKind(SyntaxKind.VariableDeclaration)
        ?.getFirstChildByKind(SyntaxKind.Identifier)
        ?.getText() || 'undefined';

    const metaDataFromTs = apiWitchRouteMetaData(
      varStatement.getFirstDescendantByKind(SyntaxKind.VariableDeclaration),
    );

    meta.method = metaDataFromTs.method;
    meta.path = metaDataFromTs.path;
    meta.auth = metaDataFromTs.auth;

    hasExportedWitchRoute = true;
  }

  if (hasExportedWitchRoute) {
    return {
      srcPath: './' + path.relative(cwd(), src.getFilePath()),
      meta,
    } as ApiWitchRouteExport;
  }

  return;
};

export const startTransform = (file: string): TransformResult | undefined => {
  const project = new Project();

  const src = project.addSourceFileAtPath(file);
  const typeChecker = project.getTypeChecker();

  /**
   * check if the file exports any Api Witch Route object. Only then
   * we will proceed
   *
   * How to do this?
   *  - get all exports of the file
   *  - go through the exports and check if any of the exports is of type ApiWitchRoute
   *    - if we found the route we can get the data types for the request and response generics
   *      - once we have the generics we can transform it into a schema containing details
   *        about the parameter, where it is coming from, and how to validate it
   *  -
   *
   */
  const apiWitchRouteExport = findApiWitchExportedRoutes(src);
  if (!apiWitchRouteExport) {
    logger.debug(`no api export found. Ignore ${src.getFilePath()} `);
    return;
  }

  /**
   * If we come here it means this file has an exported route and we have the following details
   *  - srcPath: path to the source file so we can include the item in our auto generated output
   *  - meta:
   *    - path: the URL path for the route e.g. /home
   *    - method: the HTTP method e.g.  GET POST DELETE ....
   *    - variableName: the name of the exported variable for the route
   *
   * So what is missing next?
   *
   * We need to check if request and response types / interfaces are defined. Without
   * these two files its is not a properly configured route and we can through an error
   */
  const typeRequest = src.getTypeAlias('Request');
  const typeResponse = src.getTypeAlias('Response');

  //TODO: this seem to be broken needs to be types
  const interfaceRequest = src.getInterface('Request');
  const interfaceResponse = src.getInterface('Response');

  if (!typeRequest && !interfaceRequest) {
    logger.error(
      ErrorCode.RequestTypeNotDefined,
      `Request [interface | type] not defined for ${file} \n\tPlease define teh Request type in the route`,
    );
    return;
  }

  if (!typeResponse && !interfaceResponse) {
    logger.error(
      ErrorCode.ResponseTypeNotDefined,
      `Response [interface | type] not defined for ${file} \n\tPlease define teh Response type in the route`,
    );
    return;
  }

  /**
   * Now the witch is clear that it really is an exported route. Out of the routes
   * we have to create the JSON schema that can be used for verification and
   * for automatic client generation
   */

  const requestData = processTypeOrInterface(interfaceRequest || typeRequest, 'request');
  if (!requestData) {
    logger.error(
      ErrorCode.RequestRawSchemaFailed,
      `Could not process Request [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  const responseData = processTypeOrInterface(interfaceResponse || typeResponse, 'response');
  if (!responseData) {
    logger.error(
      ErrorCode.ResponseRawSchemaFailed,
      `Could not process Response [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  return { request: requestData, response: responseData, config: apiWitchRouteExport };
};
