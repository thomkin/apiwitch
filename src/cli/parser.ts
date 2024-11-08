import { ApiWitchRouteExport, ApiWitchRouteMeta, IterReturn } from './types';
import { commentParser, mergeInputSelect } from './utils';
import { logger, ErrorCode } from './logger';
import { AutoGenMethodData } from '../types';
import { cliConfig } from './index';
import { cwd } from 'process';
import path from 'path';

import {
  Project,
  SourceFile,
  Symbol,
  TypeAliasDeclaration,
  TypeChecker,
  InterfaceDeclaration,
  SyntaxKind,
  VariableDeclaration,
} from 'ts-morph';

const extractInlineCommentByPropName = (
  typeString: string,
  propName: string,
): string | undefined => {
  const dataArr = typeString.split('\n');

  for (let i = 0; i < dataArr.length; i++) {
    const line = dataArr[i];

    const [codePart, commentPart] = line.split('//');
    const _propName = codePart.split(':')[0].trim();
    if (_propName === propName) {
      return commentPart;
    }

    continue;
  }

  return;
};

const iterateOverProps = (
  propList: Symbol[],
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
  topName: string,
  typeChecker: TypeChecker,
): IterReturn | null => {
  const paramList: any[] = [];

  propList.forEach((prop, idx) => {
    const propName = prop.getName();

    const propType = typeChecker.getTypeOfSymbolAtLocation(prop, typeDeclaration);
    const isNative = isNativeType(propType.getText());

    if (!isNative) {
      const _propType = propType.getProperties();
      const ret = iterateOverProps(_propType, typeDeclaration, propName, typeChecker);

      ret && paramList.push(ret);
      return;
    }

    const value = {} as any;
    const comment = extractInlineCommentByPropName(typeDeclaration.getText(), propName);
    const inputSelect = commentParser(comment || '', propName);

    value[propName] = { type: propType.getText(), comment, inputSelect };
    paramList.push(value);
  });

  //Merge the parameters of this child and return
  const merged = {} as any;
  merged[topName] = {};

  paramList.forEach((p) => {
    const comment = extractInlineCommentByPropName(typeDeclaration.getText(), topName);
    if (comment) {
      const inputSelect = commentParser(comment || '', topName);
      merged[topName] = { ...merged[topName], ...p, comment: comment, inputSelect };
    } else {
      merged[topName] = { ...merged[topName], ...p };
    }
  });

  return merged;
};

const processTypeOrInterface = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration | undefined,
  typeChecker: TypeChecker,
): IterReturn | undefined | null => {
  if (!typeDeclaration) {
    return;
  }

  const tsType = typeChecker.getTypeAtLocation(typeDeclaration);
  const propList = tsType.getProperties();

  const result: IterReturn = {};
  result[typeDeclaration.getName()] = {};
  const ret = iterateOverProps(propList, typeDeclaration, typeDeclaration.getName(), typeChecker);

  return ret;
};

const apiWitchRouteMetaData = (
  dec: VariableDeclaration | undefined,
): { method: string; path: string; auth: boolean } => {
  const paList = dec?.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
  const ret: { method: string; path: string; auth: boolean } = {
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
      ret.auth = value === 'true' ? true : false;
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

export const startTransform = (file: string): AutoGenMethodData | undefined => {
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
  const rawSchemaRequest = processTypeOrInterface(interfaceRequest || typeRequest, typeChecker);
  if (!rawSchemaRequest) {
    logger.error(
      ErrorCode.RequestRawSchemaFailed,
      `Could not process Request [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  const rawSchemaResponse = processTypeOrInterface(interfaceResponse || typeResponse, typeChecker);
  if (!rawSchemaResponse) {
    logger.error(
      ErrorCode.ResponseRawSchemaFailed,
      `Could not process Response [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  const inputSelect = mergeInputSelect(rawSchemaRequest);

  /**
   * Now let us put everything together, create of type MethodHandler
   * we pass it back and let the top module handle the conversion. Parsing
   * is done ! Yeah! Hex Hex!
   */
  return {
    importPath: apiWitchRouteExport.srcPath,
    callback: apiWitchRouteExport.meta.variableName,
    path: apiWitchRouteExport.meta.path,
    method: apiWitchRouteExport.meta.method,
    bodySelect: inputSelect.body,
    headerSelect: inputSelect.header,
    paramSelect: inputSelect.params,
    querySelect: inputSelect.query,
    bestEffortSelect: inputSelect.bestEffort,
    auth: apiWitchRouteExport.meta.auth,
  } as AutoGenMethodData;
};

/**
 * Checks if the given string is a TypeScript native type.
 *
 * @param {string} s The string to check.
 * @returns {boolean} True if the string is a TypeScript native type, otherwise false.
 */
export function isNativeType(s: string): boolean {
  const knownNativeTypes = [
    'any',
    'number',
    'string',
    'boolean',
    'symbol',
    'undefined',
    'null',
    'void',
    'never',
    'unknown',
    'object',
    'Date',
    'date',
  ];

  return knownNativeTypes.includes(s);
}
