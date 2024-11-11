import { ApiwitchConfig, FrameworkContext, HttpMethods, MethodHandler } from '../../types';

import { catchError, convertString } from '../../core/utils';
import { cors } from '@elysiajs/cors';
import { Context, Elysia } from 'elysia';

import swagger from '@elysiajs/swagger';
import { getAuthHandler } from '../../core/auth';
import { CoreErrorCodes, HttpErrorCode, HttpErrorMsg } from '../../core/error';
import {
  handleBestEffortDelete,
  handleBestEffortGet,
  handleBestEffortPatch,
  handleBestEffortPost,
  handleCommentInputSelect,
} from '../../core/inputSelect';
import { routeRequestValidation } from '../../core/validation';

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
          (context) => {
            const request: { [key: string]: any } = {};

            //first map the data from the different source (body, params etc..)
            handleBestEffortGet(context, handler, request);
            handleCommentInputSelect(context, handler, request);

            //Then do data validation based on the defined schema
            routeRequestValidation({
              context,
              request,
              uuid: handler.uuid,
              witchcraftSchemas: witchcraftSchemas,
            });

            //we are ready to call the handler itself,
            return handler.callback({
              request,
              error: context.error,
              redirect: context.redirect,
              meta: context.store,
            });
          },
          { beforeHandle },
        );
        break;

      case HttpMethods.post:
        _app.post(
          handler.path,
          async (context) => {
            const request: { [key: string]: any } = {};

            //first map the data from the different source (body, params etc..)
            const newBestEffortData = handleBestEffortPost(context, handler, request);
            console.log(newBestEffortData);
            handleCommentInputSelect(context, handler, request);

            //Then do data validation based on the defined schema
            routeRequestValidation({
              context,
              request,
              uuid: handler.uuid,
              witchcraftSchemas: witchcraftSchemas,
            });

            //we are ready to call the handler itself,
            return handler.callback({
              request,
              error: context.error,
              redirect: context.redirect,
              meta: context.store,
            });
          },
          { beforeHandle },
        );

        break;

      case HttpMethods.patch:
        _app.patch(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};

            //first map the data from the different source (body, params etc..)
            handleBestEffortPatch(context, handler, request);
            handleCommentInputSelect(context, handler, request);

            //Then do data validation based on the defined schema
            routeRequestValidation({
              context,
              request,
              uuid: handler.uuid,
              witchcraftSchemas: witchcraftSchemas,
            });

            //we are ready to call the handler itself,
            return handler.callback({
              request,
              error: context.error,
              redirect: context.redirect,
              meta: context.store,
            });
          },
          { beforeHandle },
        );
        break;

      case HttpMethods.delete:
        _app.delete(
          handler.path,
          (context) => {
            const request: { [key: string]: any } = {};

            //first map the data from the different source (body, params etc..)
            handleBestEffortDelete(context, handler, request);
            handleCommentInputSelect(context, handler, request);

            //Then do data validation based on the defined schema
            routeRequestValidation({
              context,
              request,
              uuid: handler.uuid,
              witchcraftSchemas: witchcraftSchemas,
            });

            //we are ready to call the handler itself,
            return handler.callback({
              request,
              error: context.error,
              redirect: context.redirect,
              meta: context.store,
            });
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

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute };
