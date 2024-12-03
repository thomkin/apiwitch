import {
  AuthType,
  ClientConfig,
  KyReturn,
  RpcRequest,
  RpcResponse,
  CoreErrorCodes,
  AuthCredentials,
} from './types';
import ky, { KyInstance } from 'ky';
import { catchError } from './utils';

let kyRpcClient: KyInstance;

const tokenStore: { [key: string]: string } = {};

export const deleteTokenFromStore = (key: string) => {
  delete tokenStore[key];
};

export const updateOrCreateToken = (key: string, cred: AuthCredentials) => {
  if (cred.authType === AuthType.basic) {
    // token = Buffer.from(token).toString('base64');
    cred.token = btoa(cred.token);
    tokenStore[key] = `Basic ${cred.token}`;
  } else if (cred.authType === AuthType.bearer) {
    tokenStore[key] = `Bearer ${cred.token}`;
  }
};

export const initRpcClient = (config: ClientConfig) => {
  Object.entries(config.authCredentials).forEach(([key, cred]) => {
    updateOrCreateToken(key, cred);
  });

  kyRpcClient = ky.create({
    prefixUrl: config.baseUrl,
  });
};

const httpErrCodeMap: { [key: string]: number } = {
  404: CoreErrorCodes.UrlNotFound,
  408: CoreErrorCodes.FetchTimeout,
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
        code: CoreErrorCodes.NoTokenFound, //TODO: add some error codes here for the client
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
        code: httpErrCodeMap[(error as any).response.status],
        message: `${(error as any).response.statusText} --> ${(error as any).response.url}`,
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
