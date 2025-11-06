import { catchError } from './utils';

import {
  AuthType,
  ClientConfig,
  KyReturn,
  RpcRequest,
  RpcResponse,
  CoreErrorCodes,
  AuthCredentials,
} from './types';

// 2. Change: kyRpcClient must be initialized as null/undefined and then awaited.
let kyRpcClient: KyInstance | undefined;

const tokenStore: { [key: string]: string } = {};

export const deleteTokenFromStore = (key: string) => {
  delete tokenStore[key];
};

export const updateOrCreateToken = (key: string, cred: AuthCredentials) => {
  if (cred.authType === AuthType.basic) {
    // token = Buffer.from(token).toString('base64');
    // NOTE: btoa is a browser/renderer function. If this code is running in
    // the Electron main process, you must use Node's Buffer.
    if (typeof btoa === 'function') {
      cred.token = btoa(cred.token);
    } else {
      // Fallback for Node.js environment (Main Process)
      cred.token = Buffer.from(cred.token).toString('base64');
    }

    tokenStore[key] = `Basic ${cred.token}`;
  } else if (cred.authType === AuthType.bearer) {
    tokenStore[key] = `Bearer ${cred.token}`;
  }
};

// -------------------------------------------------------------------------
// 3. Change: initRpcClient must be an async function to use dynamic import.
export const initRpcClient = async (config: ClientConfig) => {
  // Use dynamic import for the runtime value
  const kyModule = await import('ky');
  const ky = kyModule.default; // ky is the default export

  Object.entries(config.authCredentials).forEach(([key, cred]) => {
    updateOrCreateToken(key, cred);
  });

  if (typeof process !== 'undefined' && config.baseUrl.includes('https://localhost')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // Now initialize the client after dynamically loading ky
  kyRpcClient = ky.create({
    prefixUrl: config.baseUrl,
  });
};
// -------------------------------------------------------------------------

const httpErrCodeMap: { [key: string]: number } = {
  404: CoreErrorCodes.UrlNotFound,
  408: CoreErrorCodes.FetchTimeout,
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: CoreErrorCodes.UnableToVerifySignature,
};

interface KyRpcT<Params> {
  endpoint: string;
  authDomain: string;
  params: Params;
}

export const kyRpc = async <params, resp>(data: KyRpcT<params>): Promise<KyReturn<resp>> => {
  if (!kyRpcClient) {
    // Handle case where client hasn't been initialized (or init failed)
    return {
      error: {
        code: CoreErrorCodes.ClientNotInitialized || 9999,
        message: 'RPC client has not been initialized. Call initRpcClient first.',
      },
    } as KyReturn<resp>;
  }

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

  const [error, response] = await catchError<any>(
    kyRpcClient
      .post('rpc', {
        json: request,
      })
      .json<RpcResponse<resp>>(),
  );

  if (error) {
    if ((error as any)?.response?.status) {
      return {
        error: {
          code: httpErrCodeMap[(error as any)?.code],
          message: `Ky error: ${error}`,
        },
      } as KyReturn<resp>;
    } else {
      console.error(error);
      return {
        error: {
          code: CoreErrorCodes.KyError,
          message: 'Unhandled Ky error',
        },
      } as KyReturn<resp>;
    }
  }

  if (response?.error) {
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
