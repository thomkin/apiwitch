import { Framework, HttpMethods, MethodHandler, ApiwitchConfig } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';

export let routyfastRoute = (handler: MethodHandler): void => {
  console.error('default route handler not setup');
};

export const apiwitchInit = (config: ApiwitchConfig) => {
  switch (config.framework) {
    case Framework.elysia:
      elysiaCtx.init(config);

      //setup all the witchcraft routes --> auto generated from source code details
      config.witchcraftRoutes.forEach((route) => {
        elysiaCtx.addRoute(route)();
      });

      break;

    default:
      break;
  }
};
