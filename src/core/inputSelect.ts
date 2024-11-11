import { MethodHandler } from './types';
import { convertString } from './utils';

export const handleBestEffortGet = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> query
    if (key in context.params) {
      request[key] = context?.params?.[key];
      return;
    } else if (key in context?.query) {
      request[key] = context?.query?.[key];
      return;
    }
  });
};

export const handleBestEffortPost = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
): any => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check::  first params -->  then body
    if (key in context.params) {
      request[key] = context.params?.[key];
      return true;
    } else if (key in context?.body) {
      request[key] = context.body?.[key];
      return true;
    }
  });

  return false;
};

export const handleBestEffortPatch = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> body
    if (key in context.params) {
      request[key] = context?.params?.[key];
      return;
    } else if (key in context?.body) {
      request[key] = context?.body?.[key];
      return;
    }
  });
};

export const handleBestEffortDelete = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> query
    if (key in context.params) {
      request[key] = context?.params?.[key];
      return;
    }
    if (key in context?.query) {
      request[key] = context?.query?.[key];
      return;
    }
  });
};

export const handleCommentInputSelect = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  //get all the query parameters the user would like to have
  handler?.querySelect?.forEach((queryKey) => {
    request[queryKey] = convertString(context.query?.[queryKey]);
  });

  //get all the body parameters the user would like to have
  handler?.bodySelect?.forEach((bodyKey) => {
    request[bodyKey] = convertString((context as any).body?.[bodyKey]);
  });

  //get all the header parameters the user would like to have
  handler?.headerSelect?.forEach((headerKey) => {
    request[headerKey] = convertString(context.headers?.[headerKey]);
  });

  //get all the params the user would like to have
  handler?.paramSelect?.forEach((paramKey) => {
    request[paramKey] = convertString(context.params?.[paramKey]);
  });
};
