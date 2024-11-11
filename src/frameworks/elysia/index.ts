import { handleCommentInputSelect as handlePropsInputSelect } from '../../core/inputSelect';
import { ApiwitchConfig, FrameworkContext, HttpMethods, MethodHandler } from '../../types';
import { routeRequestValidation } from '../../core/validation';
import { Context, Elysia } from 'elysia';
import { getAuthHandler } from '../../core/auth';
import { HttpErrorCode } from '../../core/error';
import { clone } from 'radash';
import { cors } from '@elysiajs/cors';

import swagger from '@elysiajs/swagger';
import { logger } from '../../core/logger';

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

  logger.info(`Server started on port ${config.frameworkConfig.port}`);
  _app.listen(config.frameworkConfig.port);
};

const routeHandlerWrapper = async (
  context: Context,
  handler: MethodHandler,
  witchcraftSchemas: { [key: string]: any },
) => {
  const handlerReq = handlePropsInputSelect({
    handler: handler,
    body: context.body || {},
    headers: context.headers,
    params: context.params,
    query: context.query,
  });

  // console.log('context -->', context, handlerReq);

  // Then do data validation based on the defined schema
  const valid = routeRequestValidation({
    context,
    request: handlerReq,
    uuid: handler.uuid,
    witchcraftSchemas: witchcraftSchemas,
  });

  if (valid.error) {
    return valid.error;
  }

  return handler.callback({
    request: clone(valid.data),
    error: context.error,
    redirect: context.redirect,
    meta: { ...context.store },
  });
};

const addRoute = (handler: MethodHandler, witchcraftSchemas: { [key: string]: any }) => {
  const beforeHandle = (context: Context) => {
    //Handle Authentication
    const authRet = getAuthHandler(handler.auth)(context?.headers?.authorization);
    if (authRet?.error) {
      return context.error(HttpErrorCode.Unauthorized, authRet?.error);
    } else if (authRet.meta) {
      context.store = authRet.meta || {};
    }
  };

  return (): MethodHandler => {
    switch (handler.method) {
      case HttpMethods.get:
        _app.get(
          handler.path,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
        break;

      case HttpMethods.post:
        _app.post(
          handler.path,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );

        break;

      case HttpMethods.patch:
        _app.patch(
          handler.path,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );

      case HttpMethods.delete:
        _app.delete(
          handler.path,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
      default:
        break;
    }
    return handler;
  };
};

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute };
