import * as fs from 'fs';
import { CommentConfigItem, InputSourceEnum, ProcessTypeResult, SourceList } from './types';
import { CommentInputSelect, IterReturn } from './types';
import { logger } from './logger';
import { InterfaceDeclaration, SyntaxKind, TypeAliasDeclaration } from 'ts-morph';

export const getTypeScriptFiles = (includeDir: string) => {
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

  addTsFiles(includeDir);
  return tsFiles;
};

export const catchError = <T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> => {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
};

export const catchErrorSync = (fn: any): [undefined, any] | [Error] => {
  try {
    const result = fn();
    return [undefined, result];
  } catch (error) {
    return [error as Error];
  }
};

export const mergeInputSelect = (rawSchema: IterReturn) => {
  const retval: SourceList[] = [];
  function findInputSelects(obj: any) {
    for (const key in obj) {
      if (key == 'inputSelect') {
        retval.push(obj[key]);
      } else {
        if (typeof obj[key] === 'object') {
          findInputSelects(obj[key]);
        }
      }
    }
  }
  findInputSelects(rawSchema);

  const mergedObject = retval.reduce(
    (acc, curr) => {
      if (curr) {
        return {
          body: [...acc.body, ...curr.body],
          params: [...acc.params, ...curr.params],
          header: [...acc.header, ...curr.header],
          query: [...acc.query, ...curr.query],
          bestEffort: [...acc.bestEffort, ...curr.bestEffort],
        };
      }
      return acc;
    },
    { body: [], params: [], header: [], query: [], bestEffort: [] },
  );

  return mergedObject;
};

const parseHeaderInput = (comment: string): string | null => {
  const headerRegex = /@header\((.*)\)/;
  const match = comment.match(headerRegex);

  return match ? match[1] : null;
};

const parseInputWithoutParams = (comment: string, input: CommentInputSelect): string | null => {
  return comment.includes(input) ? input : null;
};

export const createSourceSelectLists = (
  comment: string,
  paramName: string,
): SourceList | undefined => {
  const params = parseInputWithoutParams(comment, CommentInputSelect.params);
  const query = parseInputWithoutParams(comment, CommentInputSelect.query);
  const body = parseInputWithoutParams(comment, CommentInputSelect.body);
  const header = parseHeaderInput(comment);

  //If no input is specified use best effort data source resolver
  if (!params && !query && !body && !header) {
    const sl: SourceList = {
      body: [],
      params: [],
      header: [],
      query: [],
      bestEffort: [paramName],
    };
    return sl;
  }

  if (params) {
    const sl: SourceList = {
      body: [],
      params: [paramName],
      header: [],
      query: [],
      bestEffort: [],
    };
    return sl;
  }

  if (query) {
    const sl: SourceList = {
      body: [],
      params: [],
      header: [],
      query: [paramName],
      bestEffort: [],
    };
    return sl;
  }

  if (body) {
    const sl: SourceList = {
      body: [paramName],
      params: [],
      header: [],
      query: [],
      bestEffort: [],
    };
    return sl;
  }

  if (header) {
    const sl: SourceList = {
      body: [],
      params: [],
      header: [paramName + ' ' + header],
      query: [],
      bestEffort: [],
    };
    return sl;
  }

  return;
};

const getSourceList = (sourceName: string, name: string, parameters: string): SourceList => {
  switch (sourceName) {
    case 'header':
      return {
        body: [],
        params: [],
        header: [name + ' ' + parameters],
        query: [],
        bestEffort: [],
      };

    case 'query':
      return {
        body: [],
        params: [],
        header: [],
        query: [name],
        bestEffort: [],
      };

    case 'params':
      return {
        body: [],
        params: [name],
        header: [],
        query: [],
        bestEffort: [],
      };

    case 'body':
      return {
        body: [name],
        params: [],
        header: [],
        query: [],
        bestEffort: [],
      };

    default:
  }

  return {
    body: [],
    params: [],
    header: [],
    query: [],
    bestEffort: [name],
  };
};

const extractInputSource = (
  text: string,
): { inputSource: string; cleanText: string; params: string } => {
  const regex = /@(header|query|body|params)(?:\(([^)]*)\))?/;
  const match = text.match(regex);
  const name = match && match[2] ? match[1] : match ? match[1] : null;

  const params = match && match[2] ? match[2].split(',').map((val) => val.trim()) : [];

  const cleanText = match ? text.replace(regex, '') : text;
  return { inputSource: name || '', cleanText, params: params.join(' ') };
};

const extractKeyName = (text: string) => {
  const parts = text.split('::');
  return parts[0].trim();
};

const getOptionsFromComment = (comment: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(comment))) {
    matches.push(match[1]);
  }
  return matches;
};

export const parseTypeCommentConfig = (
  text: string,
  keyPrepend: string,
): CommentConfigItem[] | undefined => {
  const blockCommentRegex = /\/\*\*([\s\S]*?)\*\//;
  const match = text.match(blockCommentRegex);

  if (match) {
    const tmp = match[1].replace(/\*/g, '');
    const tmpList = tmp.split('\n').filter((line) => line.trim().length > 0);

    return tmpList.map((line) => {
      const { cleanText, inputSource, params } = extractInputSource(line);
      const nameOfKey = keyPrepend + extractKeyName(line);

      const pipe = getOptionsFromComment(cleanText);

      const ret: CommentConfigItem = {
        inputSource: { params, source: inputSource as InputSourceEnum },
        sourceList: getSourceList(inputSource, nameOfKey, params),
        pipe: pipe,
        key: nameOfKey,
      };

      return ret;
    });
  }

  return;
};

export const removeTypeScriptComments = (code: string): string => {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
};

export const mergeSourceLists = (data: ProcessTypeResult) => {
  let finalSrcList = {
    body: [],
    params: [],
    header: [],
    query: [],
    bestEffort: [],
  } as SourceList;

  if (!data.typeConfig) {
    return finalSrcList;
  }

  Object.keys(data.typeConfig).forEach((key) => {
    finalSrcList.bestEffort = [
      ...finalSrcList.bestEffort,
      ...data.typeConfig[key].sourceList.bestEffort,
    ];

    finalSrcList.body = [...finalSrcList.body, ...data.typeConfig[key].sourceList.body];
    finalSrcList.header = [...finalSrcList.header, ...data.typeConfig[key].sourceList.header];
    finalSrcList.params = [...finalSrcList.params, ...data.typeConfig[key].sourceList.params];
    finalSrcList.query = [...finalSrcList.query, ...data.typeConfig[key].sourceList.query];
  });

  return finalSrcList;
};
export const getUUID = (importPath: string, callback: string) => {
  return (
    importPath.replace(/\//g, '_').replace(/\\/g, '_').replace(/\s+/g, '_').replace(/\./g, '_') +
    '_' +
    callback
  ).trim();
};

// export const getTypesFromAst = (
//   typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
//   indentLevel: number,
// ) => {
//   const typeLiteral = typeDeclaration.getFirstDescendantByKindOrThrow(SyntaxKind.TypeLiteral);

//   const propertySignatures = typeLiteral
//     .getChildrenOfKind(SyntaxKind.PropertySignature)
//     .forEach((child, idx) => {
//       const tl = child.getChildrenOfKind(SyntaxKind.TypeLiteral);

//       tl.forEach((tlChild) => {
//         console.log(tlChild.getChildrenOfKind(SyntaxKind.PropertySignature)[0].getName());
//         console.log(tlChild.getChildrenOfKind(SyntaxKind.PropertySignature)[1].getName());
//       });
//     });
// };
