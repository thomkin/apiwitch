import { CoreError, CoreErrorCodes } from './error';
import { AuthHandler, AuthReturn } from './types';

const _authHandlerMap: Map<string, AuthHandler> = new Map();

const handlerPlaceholder = async (authorization: string | undefined): Promise<AuthReturn> => {
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

export const getAuthHandler = (auth: string | boolean | undefined): AuthHandler | null => {
  if (typeof auth === 'string') {
    return _authHandlerMap.get(auth) || null;
  }
  return _authHandlerMap.get('default') || handlerPlaceholder;
};
