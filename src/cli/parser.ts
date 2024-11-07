import {
  Project,
  SourceFile,
  ts,
  Symbol,
  TypeAliasDeclaration,
  TypeChecker,
  InterfaceDeclaration,
  SyntaxKind,
  VariableDeclaration,
} from 'ts-morph';

import * as util from 'util';
import { ApiWitchRouteExport, ApiWitchRouteMeta, IterReturn } from './types';
import { cliConfig, logger } from './index';
import { commentParser, convertString, mergeInputSelect } from '../core/utils';
import path from 'path';
import { cwd } from 'process';
import { AutoGenMethodData, MethodHandler } from '../types';

/**
 * Finds all TypeScript files in the specified directories.
 *
 * @returns {string[]} The list of found TypeScript files.
 */
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

/**
 * Recursively iterates over properties of a given type declaration.
 *
 * @param {Symbol[]} propList - The list of properties to iterate over.
 * @param {TypeAliasDeclaration | InterfaceDeclaration} typeDeclaration - The type declaration that contains the propList.
 * @param {string} topName - The name of the top level parameter.
 * @param {TypeChecker} typeChecker - The type checker.
 * @returns {IterReturn | null} - The merged parameters.
 */
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

    logger.debug(`ìsNativeType ${propType.getText()}`);

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

/**
 * Recursively processes a type or interface declaration and returns a merged parameter
 * object. THe object represents the schema of the type.
 *
 * Note: Union types and intersected types  are not supported at the moment !
 *
 * @param {TypeAliasDeclaration | InterfaceDeclaration} typeDeclaration - The type
 *     declaration to process.
 * @param {TypeChecker} typeChecker - The type checker for the project.
 * @returns {IterReturn | undefined | null} - A merged parameter object or undefined
 *     if the input type declaration is undefined.
 */
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
      srcPath: path.relative(cwd(), src.getFilePath()),
      meta,
    } as ApiWitchRouteExport;
  }

  return;
};

export const startTransform = (file: string): unknown => {
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
    logger.debug(`no api export found. Throw the file into the fire. `);
    return; //no api export found so we can stop processing this source file
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
      `Request [interface | type] not defined cannot load api for ${file} \n\tPlease add type Request = {} to the route`,
    );
    return;
  }

  if (!typeResponse && !interfaceResponse) {
    logger.error(
      `Response [interface | type] not defined cannot load api for ${file}.\n\tPlease add type Response = {} to the route`,
    );
    return;
  }

  logger.debug(`found ApiWitchRoute export and all types are defined. Lets start cooking`);

  /**
   * Now the witch is clear that it really is an exported route. Out of the routes
   * we have to create the JSON schema that can be used for verification and
   * for automatic client generation
   */
  const rawSchemaRequest = processTypeOrInterface(interfaceRequest || typeRequest, typeChecker);
  if (!rawSchemaRequest) {
    logger.error(`Could not process Request [type | interface] in route ${src.getSourceFile()}`);
    return;
  }

  logger.debug(
    `Got Raw Schema for Request ${util.format(JSON.stringify(rawSchemaRequest, null, 2))}`,
  );

  const rawSchemaResponse = processTypeOrInterface(interfaceResponse || typeResponse, typeChecker);
  if (!rawSchemaResponse) {
    logger.error(`Could not process Response [type | interface] in route ${src.getSourceFile()}`);
    return;
  }

  const inputSelect = mergeInputSelect(rawSchemaRequest);

  logger.debug(`Got Raw Schema for Response ${util.format(JSON.stringify(rawSchemaResponse))}`);
  logger.debug(`Merged Input Select to configure API ${JSON.stringify(inputSelect, null, 2)}`);
  logger.debug(
    `found ApiWitchRoute export. check if types are defined... ${JSON.stringify(
      apiWitchRouteExport,
      null,
      2,
    )}`,
  );

  /**
   * Now let us put everything together, create of type MethodHandler
   * we pass it back and let the top module handle the conversion. Parsing
   * is done ! Yeah! Hex Hex!
   */

  return {
    path: apiWitchRouteExport.meta.path,
    method: apiWitchRouteExport.meta.method,
    bodySelect: inputSelect.body,
    headerSelect: inputSelect.header,
    paramSelect: inputSelect.params,
    querySelect: inputSelect.query,
    auth: apiWitchRouteExport.meta.auth,
  } as AutoGenMethodData;

  //Once we have the source file check if it imports the add route handler
  const isApiImport = tscCheckIfContainsAddRouterImport(src);

  if (!isApiImport) {
    //not a file that use the add router handler so we can skip it
    return;
  }

  //
  //tscFindHandlerInstances(src);

  // const exportedHandler = tscGetExportedHandlerFunctions(src);

  //now we have the name of the exported functions
  //but types we do not really have... we need to ix the call signature of
  //the api function  (route: string, request<T>)
  tscFindAndPrintTypeDefinitions(src);
  // console.log('STats', exportedHandler, isApiImport);

  // exportedHandler?.forEach((item) => {
  //   console.log(item.type);
  // });

  // const imports = src.getImportDeclarations();

  // let isApiImport = false;
  // for (let i = 0; i < imports.length; i++) {
  //   const importDecl = imports[i];
  //   const importNames = importDecl.getNamedImports().map((namedImport) => namedImport.getName());

  //   if (importDecl.getModuleSpecifierValue() !== routifyConfig.librarySearchString) {
  //     //not the right import statement
  //     continue;
  //   }

  //   if (!importNames.includes(routifyConfig?.apiAddRouterFunc)) {
  //     continue; // if the impor statement does not include our api name its not the correct candidate
  //   }

  //   isApiImport = true;
  //   break; //we found our import so stop
  // }
};

//TODO: still needed?
const tscCheckIfContainsAddRouterImport = (src: SourceFile): boolean => {
  const imports = src.getImportDeclarations();
  //TODO: needs to be enabled and checked again !!!
  // let isApiImport = false;
  // for (let i = 0; i < imports.length; i++) {
  //   const importDecl = imports[i];
  //   const importNames = importDecl.getNamedImports().map((namedImport) => namedImport.getName());

  //   if (importDecl.getModuleSpecifierValue() !== routifyConfig.librarySearchString) {
  //     //not the right import statement
  //     continue;
  //   }

  //   if (!importNames.includes(routifyConfig?.apiAddRouterFunc)) {
  //     continue; // if the impor statement does not include our api name its not the correct candidate
  //   }

  //   isApiImport = true;
  //   break; //we found our import so stop
  // }

  return false;
  // return isApiImport;
};

//TODO: still needed
const tscFindHandlerInstances = (src: SourceFile): void => {
  // const functionCalls = src.getDescendantsOfKind(ts.SyntaxKind.CallExpression);
  // for (const callExpr of functionCalls) {
  //   const identifier = callExpr.getExpression();
  //   // console.log(callExpr.getAncestors()[0].getText());
  //   console.log(callExpr.getParent()?.getText());
  //   if (identifier.getText() === routifyConfig.apiAddRouterFunc) {
  //     console.log(
  //       `'${routifyConfig.apiAddRouterFunc}' is called at line ${callExpr.getStartLineNumber()}`,
  //     );
  //   }
  // }
};

//TODO: still needed?
interface ExportedHandler {
  name: string;
  type: { type: string; param: string }[];
  isExported: boolean;
}

//TODO: Still needed?
const tscGetExportedHandlerFunctions = (src: SourceFile): ExportedHandler[] | undefined => {
  const exports = src.getExportedDeclarations();

  const tmpList: ExportedHandler[] = [];
  for (const [key, value] of exports) {
    //iterrate over the values
    value.forEach((declaration) => {
      // console.log(declaration.getType().getText());
      const callExp = declaration.getFirstChildByKind(ts.SyntaxKind.CallExpression);

      if (callExp) {
        // const isExporteApiHandler = callExp
        //   .getText()
        //   .startsWith(routifyConfig.apiAddRouterFunc + '<');

        const callParams = callExp.getArguments();
        const callParamTypes = callParams.map((param) => {
          return { type: param.getType().getText(), param: param.getText() };
        });

        // if (isExporteApiHandler) {
        //   tmpList.push({
        //     name: key,
        //     type: callParamTypes,
        //     isExported: isExporteApiHandler,
        //   } as ExportedHandler);
        // }
      }
    });
  }

  if (tmpList.length === 0) {
    return;
  }

  return tmpList;
};

//TODO: still needed?
const tscFindAndPrintTypeDefinitions = (src: SourceFile) => {
  // src.forEachChild((child) => {
  //   console.log('Child Kind', child.getKindName());
  // });+

  //Gets the type as string the way they are defined in code as string
  // const types = src.getTypeAliases();
  // types.forEach((item) => {
  //   console.log(item.getText(), item.getSourceFile().getFilePath());
  // });

  // //Gets the interfaces as string the way they are defined in code as string
  // const interfaces = src.getInterfaces();
  // interfaces.forEach((item) => {
  //   console.log(item.getText());
  // });

  // //see if we can find imported types also
  // const tDir = src.getTypeReferenceDirectives();
  // tDir.forEach((t) => {
  //   console.log('tDir', t.getText());
  // });

  src.getChildrenOfKind(ts.SyntaxKind.TypeAliasDeclaration).forEach((c) => {
    console.log('ccc -->', c.getText());
  });

  const decl = src.getImportDeclarations();
  // decl.forEach((item) => {
  //   // console.log('decl -->', item.getKindName());
  //   // item.getChildren().forEach((child) => {
  //   //   console.log('decl 1-->', child.getKindName());
  //   // });

  //   const k = item.getFirstChildByKind(ts.SyntaxKind.ImportClause);
  //   k?.forEachChild((c) => {
  //     // console.log('alla', c.getKindName());
  //     c.forEachChild((d) => {
  //       d.forEachChild((e) => {
  //         console.log('typeText -->', e.getType().getIntersectionTypes());
  //         console.log(typeChecker.getTypeText(e.getType()));
  //       });
  //       // console.log(d.getKindName());
  //       // console.log('ert', d.getChildAtIndex(0).getType().getText());
  //     });
  //   });
  // });
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
