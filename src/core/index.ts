import { FrameworkId, MethodHandler, ApiwitchConfig, ApiMethods } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';
import { addAuthHandler } from './auth';
import { rpcAddHandler, rpcHandler } from './rpc';

export const apiwitchInit = (config: ApiwitchConfig) => {
  switch (config.frameworkId) {
    case FrameworkId.elysia:
      elysiaCtx.init(config);

      //auth handler setup
      config.authHandlerMap.forEach((value, key) => {
        addAuthHandler(key, value);
      });

      //setup all the witchcraft routes --> auto generated from source code details
      config.witchcraftRoutes.forEach((route) => {
        if (route.method === ApiMethods.rpc) {
          rpcAddHandler(route);
        } else {
          elysiaCtx.addRoute(route, config.witchcraftSchemas)();
        }
      });

      //setup rpc route
      if (config.rpcConfig.enable) {
        elysiaCtx.rpcRoute(config.rpcConfig.path, rpcHandler, config.witchcraftSchemas);
      }

      break;

    default:
      break;
  }
};
