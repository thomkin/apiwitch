import * as fs from 'fs';
import { CommentConfigItem, InputSourceEnum, ProcessTypeResult, SourceList } from './types';
import { CommentInputSelect, IterReturn } from './types';
import { logger } from './logger';
import { InterfaceDeclaration, SyntaxKind, TypeAliasDeclaration } from 'ts-morph';

/*************  ✨ Codeium Command ⭐  *************/
/**
 * This function takes a directory path and returns an array of paths to all
 * the typescript files in that directory and any subdirectories.
 * @param includeDir the directory to start searching for typescript files
 * @returns an array of paths to all the typescript files
 */
/******  1b3d552b-b587-45bb-9692-eaebcaa14d6e  *******/
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

/*************  ✨ Codeium Command ⭐  *************/
/**
 * Given a promise, this function will catch any errors that are thrown
 * and return a promise that resolves to an array with either:
 * - [undefined, data] if the promise resolves successfully
 * - [error] if the promise rejects
 *
 * This is useful for handling errors in a functional style.
 *
 * @param promise - the promise to be wrapped
 * @returns a promise that resolves to an array with either [undefined, data] or [error]
 */
/******  8ea463d0-1b11-4794-bb8d-9ba1a50037e0  *******/
export const catchError = <T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> => {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
};

/**
 * Given a raw schema that contains inputSelect objects, this function
 * will iterate through the raw schema and extract all the inputSelect
 * objects and merge them into a single object.
 *
 * The merged object will have the following properties:
 * - body: an array of strings representing the body path
 * - params: an array of strings representing the params path
 * - header: an array of strings representing the header path
 * - query: an array of strings representing the query path
 * - bestEffort: an array of strings representing the bestEffort path
 *
 * The order of the elements in the merged array is the order of which
 * they were discovered in the raw schema.
 *
 * @param rawSchema - the raw schema
 * @returns the merged object
 */
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

/**
 * Given a source name, a name and parameters, this function
 * returns a SourceList object with all the other properties
 * empty except for the property that matches the sourceName.
 * If the sourceName is not one of the four supported sources
 * (header, query, params, body) then the bestEffort property is
 * set.
 *
 * @param sourceName - the name of the source
 * @param name - the name of the property
 * @param parameters - the parameters that should be appended to the name
 * @returns a SourceList object
 */
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

/**
 * Takes a string and returns an object with 3 properties:
 * - inputSource: the source of the input. Can be header, query, body, or params
 * - cleanText: the text without the input source
 * - params: an array of strings with the parameters if they are given
 * @param text the text to extract the input source from
 * @returns an object with the input source, the clean text, and the parameters
 */
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

/**
 * Takes a string and returns the first part of it, trimmed.
 * The string is split by '::' and the first part is returned.
 * @param text the string to split
 * @returns the first part of the string, trimmed
 */
const extractKeyName = (text: string) => {
  const parts = text.split('::');
  return parts[0].trim();
};

/**
 * Extracts options from a comment string.
 *
 * This function takes a string containing options enclosed in curly braces
 * and returns an array of strings, each representing an option found in the comment.
 *
 * @param comment - The comment string containing options in curly braces.
 * @returns An array of options extracted from the comment.
 */
const getOptionsFromComment = (comment: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(comment))) {
    matches.push(match[1]);
  }
  return matches;
};

/**
 * This function takes a string and a keyPrepend and returns an array of CommentConfigItems.
 * The string is expected to be a block comment that contains a list of keys and values.
 * The keyPrepend is a string that is added to the beginning of each key.
 * The function extracts the keys and values from the string and creates a CommentConfigItem for each.
 * The CommentConfigItem contains the key, the inputSource, the sourceList, the pipe, and the params.
 * The function returns an array of CommentConfigItems or undefined if the string is empty.
 * @param text the string to parse
 * @param keyPrepend the string to add to the beginning of each key
 * @returns an array of CommentConfigItems or undefined
 */
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

/**
 * This function takes a ProcessTypeResult and merges all the source lists together.
 * It returns a single SourceList with all the merged data.
 *
 * @param data - The data object with the typeConfig as a property
 * @returns A single SourceList with all the merged data.
 */
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
