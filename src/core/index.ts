import { Framework, HttpMethods, MethodHandler, ApiwitchConfig } from './types';
import { ctx as elysiaCtx } from '../frameworks/elysia';
import winston from 'winston';

const { combine, timestamp, label, prettyPrint, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: 'info',
  format: combine(prettyPrint(), colorize(), simple()),
  transports: [new winston.transports.Console({ level: 'debug' })],
});

export let routyfastRoute = (handler: MethodHandler): void => {
  console.error('default route handler not setup');
};

export const apiwitchInit = (config: ApiwitchConfig) => {
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

      config.witchcraftRoutes.forEach((route) => {
        logger.debug(`Adding route for --> ${route.method}::${route.path}`);
        elysiaCtx.addRoute(route)();
      });

      // console.log('add route called');
      // elysiaCtx.addRoute({
      //   method: HttpMethods.get,
      //   path: '/thomas/test/:email',
      //   callback: testCallback,
      //   querySelect: ['id', 'zwerg', 'phone'],
      //   paramSelect: ['email'],
      //   headerSelect: ['id'],
      // })();

      break;

    default:
      break;
  }
};
