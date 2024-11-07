import { Framework, HttpMethods, MethodHandler, RoutyfastConfig } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';

export let routyfastRoute = (handler: MethodHandler): void => {
  console.error('default route handler not setup');
};

export const routyfastInit = (config: RoutyfastConfig) => {
  switch (config.framework) {
    case Framework.elysia:
      console.log('routyfast::debug::selectedFramework', Framework.elysia);
      elysiaCtx.init(config);

      interface request {
        id: string;
      }

      interface response {
        code: number;
        message: string;
      }

      //call the parser to find all the functions that need

      const testCallback = async (req: request): Promise<response | undefined> => {
        console.log('Receive data in message handler -->', req);
        return { code: 123, message: 'very nice' };
      };

      elysiaCtx.addRoute({
        method: HttpMethods.get,
        path: '/thomas/test/:email',
        callback: testCallback,
        querySelect: ['id', 'zwerg', 'phone'],
        paramSelect: ['email'],
        headerSelect: ['id'],
      })();

      elysiaCtx.addRoute({
        method: HttpMethods.get,
        path: '/testing',
        callback: testCallback,
        querySelect: ['id', 'zwerg', 'phone'],
        paramSelect: ['email'],
        headerSelect: ['id'],
        bodySelect: ['key', 'elefanot'],
      })();

      break;

    default:
      break;
  }
};
