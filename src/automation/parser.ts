import * as fs from 'fs';
import { routifyConfig } from '..';
import {
  Project,
  SourceFile,
  ts,
  Symbol,
  TypeAliasDeclaration,
  TypeChecker,
  InterfaceDeclaration,
} from 'ts-morph';

import * as util from 'util';

import { IterReturn } from '../types';

/**
 * Finds all TypeScript files in the specified directories.
 *
 * @returns {string[]} The list of found TypeScript files.
 */
export const getTypeScriptFiles = () => {
  const tsFiles: string[] = [];
  const addTsFiles = (dirPath: string) => {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = `${dirPath}/${file}`;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        addTsFiles(filePath);
      } else if (file.endsWith('.ts')) {
        tsFiles.push(filePath);
      }
    });
  };

  routifyConfig?.includes?.forEach((include) => addTsFiles(include));
  return tsFiles;
};

const extractInlineCommentByPropName = (typeString: string, propName: string): string => {
  const dataArr = typeString.split('\n');
  // console.log('############# TypeString -->', typeString);
  for (let i = 0; i < dataArr.length; i++) {
    const line = dataArr[i];

    const [codePart, commentPart] = line.split('//');
    const _propName = codePart.split(':')[0].trim();
    if (_propName === propName) {
      // const propNameRegex = new RegExp(`^\\s*${propName}\\s*:`);
      // if (propNameRegex.test(codePart)) {
      //   return commentPart;
      // }

      return commentPart;

      // console.log('TEsting --->(codePar  propName) --> ', codePart, propName, codePart.split(':'));

      // return name === propName ? name : 'undefined';
    }

    continue;
  }

  return 'undefined';
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

    if (!isNative) {
      const _propType = propType.getProperties();
      const ret = iterateOverProps(_propType, typeDeclaration, propName, typeChecker);
      ret && paramList.push(ret);
      return;
    }

    const value = {} as any;

    const comment = extractInlineCommentByPropName(typeDeclaration.getText(), propName);
    value[propName] = { type: propType.getText(), comment };
    paramList.push(value);
  });

  //Merge the parameters of this child and return
  const merged = {} as any;
  merged[topName] = {};

  paramList.forEach((p) => {
    merged[topName] = { ...merged[topName], ...p };
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

export const parseFile = (file: string) => {
  const project = new Project();

  const src = project.addSourceFileAtPath(file);
  const typeChecker = project.getTypeChecker();

  const typeManfred = src.getTypeAlias('Manfred');
  // const typeManfred = src.getInterface('Response');
  const typeSchema = processTypeOrInterface(typeManfred, typeChecker);

  console.log(util.inspect(typeSchema, { depth: null }));
  // const routifastRoutes = tscFindHandlerInstances(src);
  // console.log(routifastRoutes);

  return;

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

const tscCheckIfContainsAddRouterImport = (src: SourceFile): boolean => {
  const imports = src.getImportDeclarations();

  let isApiImport = false;
  for (let i = 0; i < imports.length; i++) {
    const importDecl = imports[i];
    const importNames = importDecl.getNamedImports().map((namedImport) => namedImport.getName());

    if (importDecl.getModuleSpecifierValue() !== routifyConfig.librarySearchString) {
      //not the right import statement
      continue;
    }

    if (!importNames.includes(routifyConfig?.apiAddRouterFunc)) {
      continue; // if the impor statement does not include our api name its not the correct candidate
    }

    isApiImport = true;
    break; //we found our import so stop
  }

  return isApiImport;
};

const tscFindHandlerInstances = (src: SourceFile): void => {
  const functionCalls = src.getDescendantsOfKind(ts.SyntaxKind.CallExpression);

  for (const callExpr of functionCalls) {
    const identifier = callExpr.getExpression();
    // console.log(callExpr.getAncestors()[0].getText());
    console.log(callExpr.getParent()?.getText());

    if (identifier.getText() === routifyConfig.apiAddRouterFunc) {
      console.log(
        `'${routifyConfig.apiAddRouterFunc}' is called at line ${callExpr.getStartLineNumber()}`,
      );
    }
  }
};

interface ExportedHandler {
  name: string;
  type: { type: string; param: string }[];
  isExported: boolean;
}

const tscGetExportedHandlerFunctions = (src: SourceFile): ExportedHandler[] | undefined => {
  const exports = src.getExportedDeclarations();

  const tmpList: ExportedHandler[] = [];
  for (const [key, value] of exports) {
    //iterrate over the values
    value.forEach((declaration) => {
      // console.log(declaration.getType().getText());
      const callExp = declaration.getFirstChildByKind(ts.SyntaxKind.CallExpression);

      if (callExp) {
        const isExporteApiHandler = callExp
          .getText()
          .startsWith(routifyConfig.apiAddRouterFunc + '<');

        const callParams = callExp.getArguments();
        const callParamTypes = callParams.map((param) => {
          return { type: param.getType().getText(), param: param.getText() };
        });

        if (isExporteApiHandler) {
          tmpList.push({
            name: key,
            type: callParamTypes,
            isExported: isExporteApiHandler,
          } as ExportedHandler);
        }
      }
    });
  }

  if (tmpList.length === 0) {
    return;
  }

  return tmpList;
};
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
  ];

  return knownNativeTypes.includes(s);
}
