import {
  ApiWitchRouteExport,
  ApiWitchRouteMeta,
  IterReturn,
  ProcessTypeResult,
  PropertyList,
  TransformResult,
  TypeConfig,
} from './types';
import { parseTypeCommentConfig, removeTypeScriptComments } from './utils';
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
import { AstParser } from './ast';

const isOptional = (typeString: string, propName: string): { isOptional: boolean } | undefined => {
  const codeOnly = removeTypeScriptComments(typeString);
  const dataArr = codeOnly.split('\n');

  for (let i = 0; i < dataArr.length; i++) {
    const line = dataArr[i];

    let _propName = line.split(':')[0].trim();

    const isOptional = _propName.includes('?');
    _propName = _propName.replace(/\?/g, '');

    if (_propName === propName) {
      return { isOptional };
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
  indentLevel: number,
): IterReturn | null => {
  const paramList: any[] = [];

  propList.forEach((prop, idx) => {
    const propName = prop.getName();

    const propType = typeChecker.getTypeOfSymbolAtLocation(prop, typeDeclaration);
    const isNative = isNativeType(propType.getText());

    // constructTypesFromAst(typeDeclaration, 0);

    // console.log('Prop Type --------', propType.getProperties()[0].get);

    if (!isNative) {
      const _propType = propType.getProperties();
      const ret = iterateOverProps(
        _propType,
        typeDeclaration,
        propName,
        typeChecker,
        indentLevel + 1,
      );

      ret && paramList.push(ret);
      return;
    }

    //if we come here it means we reached the end of the child branch

    const value = {} as IterReturn;
    const optional = isOptional(typeDeclaration.getText(), propName);
    // const inputSelect = createSourceSelectLists(tmp?.comment || '', propName);

    // value[propName] = { type: propType.getText(), required: !optional };
    paramList.push(value);
  });

  //Merge the parameters of this child and return
  const merged: IterReturn = {};

  //@ts-ignore
  merged[topName] = {} as IterReturn;

  paramList.forEach((item) => {
    merged[topName] = { ...merged[topName], ...item };
    // const comment = splitCodeAndComments(typeDeclaration.getText(), topName, indentLevel);
    // if (comment) {
    //   // const inputSelect = createSourceSelectLists(comment.comment || '', topName);
    //   merged[topName] = {
    //     ...merged[topName],
    //     ...p,
    //     // comment: comment,
    //     // inputSelect,
    //   };
    // } else {
    // }
  });

  return merged;
};

const processTypeOrInterface = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration | undefined,
  typeChecker: TypeChecker,
  keyPrepend: string,
): ProcessTypeResult | undefined | null => {
  if (typeDeclaration) {
    const astParser = new AstParser();
    const typeConfigArr = parseTypeCommentConfig(typeDeclaration.getText(), keyPrepend);

    const typeConfig: TypeConfig = {};

    typeConfigArr?.forEach((cfg, idx) => {
      typeConfig[cfg.key] = {
        inputSource: typeConfigArr[idx].inputSource,
        pipe: typeConfigArr[idx].pipe,
        sourceList: typeConfigArr[idx].sourceList,
      };
    });

    console.log(
      '\n\n manfred ----------- \n ',
      astParser.getSchemaFromTypeDeclaration(typeDeclaration),
    );

    return {
      propertyList: astParser.getSchemaFromTypeDeclaration(typeDeclaration),
      typeConfig: typeConfig,
    };
  }
  return;

  // const tsType = typeChecker.getTypeAtLocation(typeDeclaration);
  // const propList = tsType.getProperties();

  // const result: IterReturn = {};

  // //@ts-ignore
  // result[typeDeclaration.getName()] = {};

  // const ret = iterateOverProps(
  //   propList,
  //   typeDeclaration,
  //   typeDeclaration.getName(),
  //   typeChecker,
  //   0,
  // );

  // const typeConfig = parseTypeCommentConfig(typeDeclaration.getText());

  // return {
  //   typeConfig: typeConfig || [],
  //   typeObject: ret || {},
  // };
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

  const requestData = processTypeOrInterface(
    interfaceRequest || typeRequest,
    typeChecker,
    'request.',
  );
  if (!requestData) {
    logger.error(
      ErrorCode.RequestRawSchemaFailed,
      `Could not process Request [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  const responseData = processTypeOrInterface(
    interfaceResponse || typeResponse,
    typeChecker,
    'response.',
  );
  if (!responseData) {
    logger.error(
      ErrorCode.ResponseRawSchemaFailed,
      `Could not process Response [type | interface] in route ${src.getSourceFile()}`,
    );
    return;
  }

  return { request: requestData, response: responseData, config: apiWitchRouteExport };

  // const inputSelect = mergeInputSelect(rawSchemaRequest);

  /**
   * Now let us put everything together, create of type MethodHandler
   * we pass it back and let the top module handle the conversion. Parsing
   * is done ! Yeah! Hex Hex!
   */

  //TODO: this needs to be fixed!!!!!
  // return {
  //   importPath: apiWitchRouteExport.srcPath,
  //   callback: apiWitchRouteExport.meta.variableName,
  //   path: apiWitchRouteExport.meta.path,
  //   method: apiWitchRouteExport.meta.method,
  //   bodySelect: inputSelect.body,
  //   headerSelect: inputSelect.header,
  //   paramSelect: inputSelect.params,
  //   querySelect: inputSelect.query,
  //   bestEffortSelect: inputSelect.bestEffort,
  //   auth: apiWitchRouteExport.meta.auth,
  //   requestTypeString: (interfaceRequest || typeRequest)?.getText(),
  //   responseTypeString: (interfaceResponse || typeResponse)?.getText(),
  //   rawSchemaRequest: rawSchemaRequest,
  // } as AutoGenMethodData;
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
