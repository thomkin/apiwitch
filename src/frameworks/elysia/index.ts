import { handleCommentInputSelect as handlePropsInputSelect } from '../../core/inputSelect';
import { routeRequestValidation } from '../../core/validation';
import { getAuthHandler } from '../../core/auth';
import { HttpErrorCode } from '../../core/error';
import { Context, Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { clone } from 'radash';
import { logger } from '../../core/logger';

import swagger from '@elysiajs/swagger';

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

let _app: Elysia;

const init = (config: ApiwitchConfig) => {
  if (config.sslConfig) {
    console.log('running with ssl');
    const app = new Elysia({
      serve: {
        tls: {
          cert: config.sslConfig.cert,
          key: config.sslConfig.key,
        },
      },
    });
    _app = app;
  } else {
    const app = new Elysia();
    _app = app;
  }

  //setup cors
  _app.use(cors(config.frameworkConfig.cors));

  //add the routes
  if (process.env.ENVIRONMENT === 'dev' && config.frameworkConfig.swagger) {
    _app.use(
      swagger({
        path: config.frameworkConfig.swagger?.path,
      }),
    );
  }

  logger.info(` Server started on port ${config.frameworkConfig.port}`);
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

  return await handler.callback({
    request: clone(valid.data),
    error: context.error,
    redirect: context.redirect,
    cookie: context.cookie,
    meta: { ...context.store },
  });
};

const addRoute = (
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
        return context.error(HttpErrorCode.Unauthorized, authRet?.error);
      } else if (authRet.meta) {
        context.store = authRet.meta || {};
      }
    } catch (error) {
      return context.error(HttpErrorCode.InternalServerError, {
        message: 'An unexpected error occurred when executing the auth handler',
        code: HttpErrorCode.InternalServerError,
      });
    }

    //handle user specific permission check.
    if (permissionCheck) {
      if (!permissionCheck(authRet?.meta?.['userId'], handler.permission)) {
        return context.error(HttpErrorCode.Forbidden, {
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
        _app.get(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
        break;

      case ApiMethods.post:
        _app.post(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );

        break;

      case ApiMethods.patch:
        _app.patch(
          handler.endpoint,
          async (context) => {
            return routeHandlerWrapper(context, handler, witchcraftSchemas);
          },
          { beforeHandle },
        );
        break;
      case ApiMethods.delete:
        _app.delete(
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
  path: string,
  callback: RpcRouteHandler,
  witchcraftSchemas: { [key: string]: any },
  permissionCheck?: PermissionCheck,
) => {
  _app.post(path, async (context) => {
    const body = context.body as RpcRequest<any>;

    return callback({
      request: {
        authorization: body.authorization,
        endpoint: body.endpoint,
        params: body.params,
        id: body.id,
      },
      error: context.error,
      witchcraftSchemas,
      permissionCheck,
    });
  });
};

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute, rpcRoute };
