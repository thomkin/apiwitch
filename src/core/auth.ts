import { CoreError, CoreErrorCodes, HttpErrorCode, HttpErrorMsg } from './error';
import { AuthHandler } from './types';

const _authHandlerMap: Map<string, AuthHandler> = new Map();

const handlerPlaceholder = (authorization: string | undefined) => {
  console.log('default auth handler called', authorization);

  return;

  return {
    code: HttpErrorCode.Unauthorized,
    responseMsg: {
      code: CoreErrorCodes.NoAuthHandlerDefined,
      msg: 'could not find auth handler so we block the route by default',
    },
  } as HttpErrorMsg;

  //   throw new CoreError(
  //     CoreErrorCodes.NoAuthHandlerDefined,
  //     `No auth handler defined all requested are rejected!`,
  //   );
};

export const addAuthHandler = (id: string, handler: AuthHandler) => {
  if (_authHandlerMap.has(id)) {
    throw new CoreError(
      CoreErrorCodes.AuthHandlerAlreadyExists,
      `Auth handler with id ${id} already exists`,
    );
  }

  _authHandlerMap.set(id, handler);
};

export const getAuthHandler = (auth: string | boolean | undefined): AuthHandler => {
  if (typeof auth === 'string') {
    return _authHandlerMap.get(auth) || handlerPlaceholder;
  }
  return _authHandlerMap.get('default') || handlerPlaceholder;
};
