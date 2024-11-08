import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { FrameworkContext, RoutyfastConfig, HttpMethods, MethodHandler } from '../../types';
import swagger from '@elysiajs/swagger';
import { convertString } from '../../core/utils';

let _app: Elysia;

const init = (config: RoutyfastConfig) => {
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

const addRoute = (handler: MethodHandler) => {
  console.log('add route called in framwerok');
  return (): MethodHandler => {
    switch (handler.method) {
      case HttpMethods.get:
        _app.get(handler.path, (context) => {
          const request: { [key: string]: any } = {};
          console.log(context.params);
          //get all the query parameters the user would like to have
          handler?.querySelect?.forEach((queryKey) => {
            request[queryKey] = convertString(context.query[queryKey]);
          });
          //get all the body parameters the user would like to have
          handler?.bodySelect?.forEach((bodyKey) => {
            request[bodyKey] = convertString((context as any).body[bodyKey]);
          });

          //get all the header parameters the user would like to have
          handler?.headerSelect?.forEach((headerKey) => {
            request[headerKey] = convertString(context.headers[headerKey]);
          });
          //get all the params the user would like to have
          handler?.paramSelect?.forEach((paramKey) => {
            request[paramKey] = convertString(context.params[paramKey]);
          });

          return handler.callback(request);
        });
        break;

      case HttpMethods.post:
        break;

      case HttpMethods.patch:
        break;

      case HttpMethods.delete:
        break;

      default:
        break;
    }
    return handler;
  };
};

//Export the context of the framework for core to execute framework functions
export const ctx: FrameworkContext = { init, addRoute };
