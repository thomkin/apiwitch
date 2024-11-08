import * as fs from 'fs';
import { SourceList } from './types';
import { CommentInputSelect, IterReturn } from './types';

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

const parseHeaderInput = (comment: string) => {
  const headerRegex = /@header\((.*)\)/;
  const match = comment.match(headerRegex);

  return match ? match[1] : null;
};

const parseInputWithoutParams = (comment: string, input: CommentInputSelect) => {
  return comment.includes(input) ? input : '';
};

export const commentParser = (comment: string, paramName: string): SourceList | undefined => {
  if (comment.length < 4) {
    const sl: SourceList = {
      body: [],
      params: [],
      header: [],
      query: [],
      bestEffort: [paramName],
    };
    return sl;
  }

  const params = parseInputWithoutParams(comment, CommentInputSelect.params);
  if (params.length > 0) {
    const sl: SourceList = {
      body: [],
      params: [paramName],
      header: [],
      query: [],
      bestEffort: [],
    };
    return sl;
  }

  const query = parseInputWithoutParams(comment, CommentInputSelect.query);
  if (query.length > 0) {
    const sl: SourceList = {
      body: [],
      params: [],
      header: [],
      query: [paramName],
      bestEffort: [],
    };
    return sl;
  }

  const body = parseInputWithoutParams(comment, CommentInputSelect.body);
  if (body.length > 0) {
    const sl: SourceList = {
      body: [paramName],
      params: [],
      header: [],
      query: [],
      bestEffort: [],
    };
    return sl;
  }

  //TODO: header will not work at the moment, but not so important
  const header = parseHeaderInput(comment);
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
