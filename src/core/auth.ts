import { CoreError, CoreErrorCodes } from './error';
import { AuthHandler, AuthReturn } from './types';

const _authHandlerMap: Map<string, AuthHandler> = new Map();

const handlerPlaceholder = (authorization: string | undefined): AuthReturn => {
  return {
    error: {
      code: CoreErrorCodes.NoAuthHandlerDefined,
      message:
        'internal auth handler was used!!!. Route is clocked. Please set the correct auth handler',
    },
  };
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
