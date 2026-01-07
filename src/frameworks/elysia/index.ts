import { handleCommentInputSelect as handlePropsInputSelect } from '../../core/inputSelect';
import { routeRequestValidation } from '../../core/validation';
import { getAuthHandler } from '../../core/auth';
import { HttpErrorCode, HttpErrorMsg } from '../../core/error';
import { logger } from '../../core/logger';
import { Context, Cookie, Elysia } from 'elysia';
import { cors } from '@elysiajs/cors'; /**

   * request_url:: @query

   */
import { clone } from 'radash';

import {
  ApiwitchConfig,
  FrameworkContext,
  ApiMethods,
  MethodHandler,
  RpcRouteHandler,
  RpcRequest,
  PermissionCheck,
  AuthReturn,
} from '../../types';

import swagger from '@elysiajs/swagger';
import { number } from 'valibot';

// let _app: Elysia;

const init = (config: ApiwitchConfig): Elysia => {
  let appCfg: any = {};

  if (config.sslConfig) {
    appCfg = {
      serve: {
        tls: {
          cert: Bun.file(config.sslConfig.cert),
          key: Bun.file(config.sslConfig.key),
        },
      },
    };
  } else {
    appCfg = {};
  }

  const app = new Elysia(appCfg);

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

  return app;
};

const errorHandler = (code: HttpErrorCode, message: HttpErrorMsg | undefined) => {
  class MyError extends Error {
    constructor(
      public message: string,
      public status: number,
    ) {
      super(message);
    }
  }

  throw new MyError(`Error ${code}: ${JSON.stringify(message)}`, code);
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

  // Then do data validation based on the defined schema
  const valid = routeRequestValidation({
    context,
    request: handlerReq,
    uuid: handler.uuid,
    witchcraftSchemas: witchcraftSchemas,
    errorHandler,
  });

  if (valid.error) {
    return valid.error;
  }

  return await handler.callback({
    request: clone(valid.data),
    // error: context.error,
    error: (code: HttpErrorCode, message: string) => errorHandler(code, { message, code }),
    redirect: context.redirect,
    cookie: context.cookie as Record<string, Cookie<string | undefined>>, // Add type assertion
    ip: context.server?.requestIP(context.request),
    meta: { ...context.store },
    path: context.path,
    raw: {
      query: context.query,
      params: context.params,
      headers: context.headers,
    },
  });
};

const addRoute = (
  app: Elysia,
  handler: MethodHandler,
  witchcraftSchemas: { [key: string]: any },
  permissionCheck?: PermissionCheck,
) => {
  const beforeHandle = async (context: Context) => {
    //Handle Authentication
    let authRet: AuthReturn | undefined;
    try {
      authRet = await getAuthHandler(handler.auth)?.(context?.headers?.authorization);
      if (!authRet || authRet?.error) {
        return errorHandler(HttpErrorCode.Unauthorized, authRet?.error);
      } else if (authRet.meta) {
        context.store = authRet.meta || {};
      }
    } catch (error) {
      return errorHandler(HttpErrorCode.InternalServerError, {
        message: 'An unexpected error occurred when executing the auth handler',
        code: HttpErrorCode.InternalServerError,
      });
    }

    //handle user specific permission check.
    if (permissionCheck) {
      if (!permissionCheck(authRet?.meta?.['userId'], handler.permission)) {
        return errorHandler(HttpErrorCode.Forbidden, {
          message: 'User permission check failed',
          code: HttpErrorCode.Forbidden,
        });
      }
    }
  };

  return (): MethodHandler => {
    //Setup RPC

    switch (handler.method) {
      case ApiMethods.get:
        app
          .get(
            handler.endpoint,
            async (context) => {
              return routeHandlerWrapper(context, handler, witchcraftSchemas);
            },
            { beforeHandle },
          )
          .onError(({ code, error, status }) => {
            console.log('Error', error);
          });
        break;

      case ApiMethods.post:
        app.post(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );

        break;

      case ApiMethods.patch:
        app.patch(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
        break;
      case ApiMethods.delete:
        app.delete(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
        break;

      default:
        break;
    }
    return handler;
  };
};

const rpcRoute = async (
  app: Elysia,
  path: string,
  callback: RpcRouteHandler,
  witchcraftSchemas: { [key: string]: any },
  permissionCheck?: PermissionCheck,
) => {
  app.post(path, async (context) => {
    const body = context.body as RpcRequest<any>;

    return callback({
      request: {
        authorization: body.authorization,
        endpoint: body.endpoint,
        params: body.params,
        id: body.id,
      },
      error: (code: number, message: string) => errorHandler(code, { message, code }),
      witchcraftSchemas,
      permissionCheck,
    });
  });
};

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute, rpcRoute };
