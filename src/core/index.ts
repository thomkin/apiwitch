import { FrameworkId, MethodHandler, ApiwitchConfig } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';
import { addAuthHandler } from './auth';

export let routyfastRoute = (handler: MethodHandler): void => {
  console.error('default route handler not setup');
};

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
        elysiaCtx.addRoute(route, config.witchcraftSchemas)();
      });

      break;

    default:
      break;
  }
};
