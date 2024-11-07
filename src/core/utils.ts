import { CommentInputSelect, IterReturn } from '../cli/types';
import { SourceList } from './types';

export const convertString = (s: string | undefined): boolean | number | string | undefined => {
  if (!s) {
    return;
  }

  if (s.toLowerCase() === 'true') return true;

  if (s.toLowerCase() === 'false') return false;
  const num = parseInt(s, 10);
  if (!isNaN(num)) return num;
  return s;
};

export const rawSchemaToTypeScript = (raw: IterReturn) => {};

export const commentParser = (comment: string, paramName: string): SourceList | undefined => {
  const params = parseInputWithoutParams(comment, CommentInputSelect.params);
  if (params.length > 0) {
    const sl: SourceList = {
      body: [],
      params: [paramName],
      header: [],
      query: [],
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
    };
    return sl;
  }

  return;
};

const parseHeaderInput = (comment: string) => {
  const headerRegex = /@header\((.*)\)/;
  const match = comment.match(headerRegex);

  return match ? match[1] : null;
};

const parseInputWithoutParams = (comment: string, input: CommentInputSelect) => {
  return comment.includes(input) ? input : '';
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
        };
      }
      return acc;
    },
    { body: [], params: [], header: [], query: [] },
  );

  return mergedObject;
};
