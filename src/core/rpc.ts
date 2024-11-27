import { MethodHandler, PermissionCheck, RpcResponse, RpcReturn, RpcRouteRequest } from './types';
import { minifyValibotError } from './validation';
import { getAuthHandler } from './auth';
import { CoreErrorCodes } from './error';

import * as v from 'valibot';
import { ErrorCode, logger } from './logger';

//Handle the RPC mechanism using JSON RPC protocol

const rpcHandlerMap: { [key: string]: MethodHandler } = {};

export const rpcAddHandler = (handler: MethodHandler) => {
  rpcHandlerMap[handler.endpoint] = { ...handler };
  logger.debug(`Added RPC route endpoint:  ${handler.endpoint}`);
};

export const rpcRemoveHandler = (endpoint: string) => {
  delete rpcHandlerMap[endpoint];
};

export const printHandlerDetails = () => {
  const data = Object.keys(rpcHandlerMap).map((key) => {
    return { endpoint: rpcHandlerMap[key].endpoint };
  });

  logger.info(`handlerMap, ${JSON.stringify(data, null, 2)}`);
};

export const rpcHandler = async (input: RpcRouteRequest): Promise<any> => {
  const handler = rpcHandlerMap[input.request.endpoint];

  if (!handler) {
    return {
      error: {
        appCode: CoreErrorCodes.RpcEndpointDoesNotExist,
        message: `endpoint does not exist --> ${input.request.endpoint}`,
      },
    };
  }

  const authHandler = getAuthHandler(handler.auth);
  if (!authHandler) {
    return {
      id: -1,
      error: {
        appCode: CoreErrorCodes.RpcAuthNotExists,
        message: `selected auth method does not exist --> ${handler.auth}`,
      },
    };
  }

  const { error, meta } = await authHandler(input.request.authorization);
  if (error) {
    return {
      id: -1,
      error: {
        appCode: CoreErrorCodes.RpcAuthNotAllowed,
        message: error.message,
      },
    };
  }

  //if we come here it means we are using correct access token but we have not checked yet if
  //the user has permission
  //handle user specific permission check.
  if (input.permissionCheck) {
    const ok = await input.permissionCheck(meta?.['userId'], handler.permission);
    if (!ok) {
      const res: RpcResponse<any> = {
        id: -1,
        error: {
          appCode: CoreErrorCodes.PermissionCheckFailed,
          message: 'User permission check failed',
        },
      };

      return res;
    }
  }

  //now we can verify the parameters
  const requestSchema = input.witchcraftSchemas[handler.uuid + '_valibot_request'];
  if (!requestSchema) {
    return { data: {}, error: undefined };
  }

  const valibot = v.safeParse(requestSchema, { ...input.request.params });
  if (valibot.issues) {
    const res: RpcResponse<any> = {
      id: -1,
      error: {
        appCode: CoreErrorCodes.RpcPacketMalformed,
        message: minifyValibotError(valibot.issues) as any,
      },
    };

    return res;
  }

  //if we come here we can finally call the rpc callback handler
  const ret = (await handler.callback({
    error: input.error,
    meta: meta as { [key: string]: any },
    request: valibot.output,
  })) as RpcReturn<any>;

  const response: RpcResponse<any> = {
    id: input.request.id,
    error: ret.error,
    result: ret.result,
  };

  return response;
};
