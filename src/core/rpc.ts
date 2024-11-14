import { getAuthHandler } from './auth';
import { CoreError, CoreErrorCodes } from './error';
import { MethodHandler, RpcHandlerInput, RpcRequest, RpcResponse, RpcRouteRequest } from './types';
import { minifyValibotError, routeRequestValidation } from './validation';
import * as v from 'valibot';

//Handle the RPC mechanism using JSON RPC protocol

const rpcHandlerMap: { [key: string]: MethodHandler } = {};

export const rpcAddHandler = (handler: MethodHandler) => {
  rpcHandlerMap[handler.endpoint] = { ...handler };
};

export const rpcRemoveHandler = (endpoint: string) => {
  delete rpcHandlerMap[endpoint];
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
        message: `no permission to access the endpoint`,
      },
    };
  }

  //now we can verify the parameters
  const requestSchema = input.witchcraftSchemas[handler.uuid + '_valibot_request'];
  if (!requestSchema) {
    return { data: {}, error: undefined };
  }

  const valibot = v.safeParse(requestSchema, input.request);
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
  const ret = await handler.callback({
    error: input.error,
    meta: meta as { [key: string]: any },
    request: valibot.output,
  });

  return ret;
};
