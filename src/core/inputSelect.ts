import { construct, crush, set } from 'radash';
import { MethodHandler } from './types';

export enum BestEffortMode {
  ParamQueryBody = 'pqb',
  ParamQuery = 'pq',
  ParamBody = 'pb',
}

export const handleBestEffort = (input: {
  query: { [key: string]: any };
  headers: { [key: string]: any };
  body: { [key: string]: any };
  params: { [key: string]: any };
  // mode: BestEffortMode;
  handler: MethodHandler;
}): any => {
  let output: { [key: string]: any } = {};
  const mode =
    input.handler.method === 'get'
      ? BestEffortMode.ParamQuery
      : input.handler.method === 'post'
        ? BestEffortMode.ParamBody
        : input.handler.method === 'patch'
          ? BestEffortMode.ParamQueryBody
          : input.handler.method === 'delete'
            ? BestEffortMode.ParamQuery
            : BestEffortMode.ParamQueryBody;

  for (let i = 0; i < mode.length; i++) {
    const char = mode[i];
    switch (char) {
      case 'p':
        constructData(input.params, input?.handler?.bestEffortSelect || [], output);
        break;
      case 'q':
        constructData(input.query, input?.handler?.bestEffortSelect || [], output);
        break;
      case 'b':
        constructData(input.body, input?.handler?.bestEffortSelect || [], output);
        break;
      case 'h':
        constructData(input.headers, input?.handler?.bestEffortSelect || [], output);
        break;
    }
  }

  return construct(output);
};

const constructData = (data: any, selectObj: string[], output: { [key: string]: any }) => {
  selectObj?.forEach((selecTKey) => {
    const crushedBody = crush(data) as { [key: string]: any };
    const value = crushedBody[selecTKey];

    let tmp = set<{ [key: string]: any }, any>({}, selecTKey, value);
    output[selecTKey] = value;
  });
};

export const handleCommentInputSelect = (input: {
  query: { [key: string]: any };
  headers: { [key: string]: any };
  body: { [key: string]: any };
  params: { [key: string]: any };
  handler: MethodHandler;
}): { [key: string]: any } => {
  let output: { [key: string]: any } = {};

  const newBestEffortData = handleBestEffort({
    handler: input.handler,
    body: input.body || {},
    headers: input.headers,
    params: input.params,
    query: input.query,
  });

  constructData(input.body, input?.handler?.bodySelect || [], output);
  constructData(input.query, input?.handler?.querySelect || [], output);
  constructData(input.params, input?.handler?.paramSelect || [], output);
  constructData(input.headers, input?.handler?.headerSelect || [], output);

  const outConstruct = construct(output);

  return Object.assign({}, outConstruct, newBestEffortData);
};
