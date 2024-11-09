import { ApiwitchConfig, FrameworkContext, HttpMethods, MethodHandler } from '../../types';
import { convertString } from '../../core/utils';
import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';

import swagger from '@elysiajs/swagger';
import { getAuthHandler } from '../../core/auth';
import { HttpErrorCode, HttpErrorMsg } from '../../core/error';

let _app: Elysia;

const init = (config: ApiwitchConfig) => {
  const app = new Elysia();
  _app = app;

  //setup cors
  app.use(cors(config.frameworkConfig.cors));

  //add the routes
  if (process.env.ENVIRONMENT === 'dev' && config.frameworkConfig.swagger) {
    app.use(
      swagger({
        path: config.frameworkConfig.swagger?.path,
      }),
    );
  }

  //start the server
  _app.listen(3000);
};
const handleBestEffortGet = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> query
    if (context?.params?.[key]) {
      request[key] = context?.params?.[key];
      return;
    }
    if (context?.query?.[key]) {
      request[key] = context?.query?.[key];
      return;
    }
  });
};

const handleBestEffortPost = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> body
    if (context?.params?.[key]) {
      request[key] = context?.params?.[key];
      return;
    }
    if (context?.body?.[key]) {
      request[key] = context?.body?.[key];
      return;
    }
  });
};

const handleBestEffortPatch = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> body -> query
    if (context?.params?.[key]) {
      request[key] = context?.params?.[key];
      return;
    }
    if (context?.body?.[key]) {
      request[key] = context?.body?.[key];
      return;
    }
  });
};

const handleBestEffortDelete = (
  context: any,
  handler: MethodHandler,
  request: { [key: string]: any },
) => {
  handler?.bestEffortSelect?.forEach((key) => {
    //check:: params --> query
    if (context?.params?.[key]) {
      request[key] = context?.params?.[key];
      return;
    }
    if (context?.query?.[key]) {
      request[key] = context?.query?.[key];
      return;
    }
  });
};

const handleCommentInputSelect = (
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

const authenticate = (context: any, handler: MethodHandler): HttpErrorMsg | undefined => {
  const error = getAuthHandler(handler.auth)(context?.headers?.authorization);
  return context.error(
    error?.code || HttpErrorCode.InternalServerError,
    error?.responseMsg || 'authenticate function failed unexpectedly',
  );
};

const addRoute = (handler: MethodHandler) => {
  return (): MethodHandler => {
    switch (handler.method) {
      case HttpMethods.get:
        _app.get(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};

            handleBestEffortGet(context, handler, request);
            handleCommentInputSelect(context, handler, request);
            return handler.callback(request, context.error, context.redirect);
          },
          {
            beforeHandle: (context) => {
              const error = getAuthHandler(handler.auth)(context?.headers?.authorization);
              if (error) {
                return context.error(error.code, error.responseMsg);
              }
            },
          },
        );
        break;

      case HttpMethods.post:
        _app.post(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};
            getAuthHandler(handler.auth)(context?.headers?.authorization);

            handleBestEffortPost(context, handler, request);
            handleCommentInputSelect(context, handler, request);
            return handler.callback(request, context.error, context.redirect);
          },
          {
            beforeHandle: (context) => {
              const error = getAuthHandler(handler.auth)(context?.headers?.authorization);
              if (error) {
                return context.error(error.code, error.responseMsg);
              }
            },
          },
        );

        break;

      case HttpMethods.patch:
        _app.patch(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};
            handleBestEffortPatch(context, handler, request);
            handleCommentInputSelect(context, handler, request);
            return handler.callback(request, context.error, context.redirect);
          },
          {
            beforeHandle: (context) => {
              const error = getAuthHandler(handler.auth)(context?.headers?.authorization);
              if (error) {
                return context.error(error.code, error.responseMsg);
              }
            },
          },
        );
        break;

      case HttpMethods.delete:
        _app.delete(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};
            handleBestEffortDelete(context, handler, request);
            handleCommentInputSelect(context, handler, request);
            return handler.callback(request, context.error, context.redirect);
          },
          {
            beforeHandle: (context) => {
              const error = getAuthHandler(handler.auth)(context?.headers?.authorization);
              if (error) {
                return context.error(error.code, error.responseMsg);
              }
            },
          },
        );
        break;

      default:
        break;
    }
    return handler;
  };
};

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute };
