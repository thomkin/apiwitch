import { FrameworkId, MethodHandler, ApiwitchConfig, ApiMethods } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';
import { addAuthHandler } from './auth';
import { printHandlerDetails, rpcAddHandler, rpcHandler } from './rpc';

export const apiwitchInit = (config: ApiwitchConfig): { info: () => void } => {
  switch (config.frameworkId) {
    case FrameworkId.elysia:
      const app = elysiaCtx.init(config);

      //auth handler setup
      config.authHandlerMap.forEach((value, key) => {
        addAuthHandler(key, value);
      });

      //setup all the witchcraft routes --> auto generated from source code details
      config.witchcraftRoutes.forEach((route) => {
        if (route.method === ApiMethods.rpc) {
          rpcAddHandler(route);
        } else {
          elysiaCtx.addRoute(app, route, config.witchcraftSchemas, config.permissionCheck)();
        }
      });

      //setup rpc route
      if (config.rpcConfig.enable) {
        elysiaCtx.rpcRoute(
          app,
          config.rpcConfig.path,
          rpcHandler,
          config.witchcraftSchemas,
          config.permissionCheck,
        );
      }

      break;

    default:
      break;
  }

  return {
    info: () => {
      printHandlerDetails();
    },
  };
};
