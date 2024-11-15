import {
  AuthType,
  ClientConfig,
  ClientErrorCodes,
  KyReturn,
  RpcRequest,
  RpcResponse,
} from './types';
import ky, { KyInstance } from 'ky';
import { catchError } from './utils';

let kyRpcClient: KyInstance;

const tokenStore: { [key: string]: string } = {};

export const deleteTokenStore = (key: string) => {
  delete tokenStore[key];
};

export const initRpcClient = (config: ClientConfig) => {
  Object.entries(config.authCredentials).forEach(([key, { authType, token }]) => {
    if (authType === AuthType.basic) {
      token = Buffer.from(token).toString('base64');
      tokenStore[key] = `Basic ${token}`;
    } else if (authType === AuthType.bearer) {
      tokenStore[key] = `Bearer ${token}`;
    }
  });

  kyRpcClient = ky.create({
    prefixUrl: config.baseUrl,
  });
};

interface KyRpcT<Params> {
  endpoint: string;
  authDomain: string;
  params: Params;
}

export const kyRpc = async <params, resp>(data: KyRpcT<params>): Promise<KyReturn<resp>> => {
  const token = tokenStore[data.authDomain];
  if (!token) {
    const noTokenFound: KyReturn<resp> = {
      error: {
        code: ClientErrorCodes.NoTokenFound, //TODO: add some error codes here for the client
        message: 'could not find any token',
      },
    };

    return noTokenFound;
  }

  const request: RpcRequest<params> = {
    id: Math.floor(Math.random() * 1000000),
    authorization: token,
    endpoint: data.endpoint,
    params: data.params,
  };

  const [error, response] = await catchError(
    kyRpcClient
      .post('rpc', {
        json: request,
      })
      .json<RpcResponse<resp>>(),
  );

  if (error) {
    return {
      error: {
        code: error.errno,
        message: `${error.code} --> ${error.path}`,
      },
    } as KyReturn<resp>;
  }

  if (response.error) {
    return {
      error: {
        code: response.error.appCode,
        message: response.error.message,
      },
    };
  }

  return {
    data: response.result,
  } as KyReturn<resp>;
};
