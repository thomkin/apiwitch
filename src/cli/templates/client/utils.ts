import { KyError } from './types';

/**
 * Wraps a promise such that it returns a tuple indicating success or failure.
 *
 * On success, the promise resolves to `[undefined, data]`.
 * On failure, it resolves to `[error]`.
 *
 * This is useful for handling promises in a functional style without using try-catch blocks.
 *
 * @param promise - The promise to be wrapped.
 * @returns A promise that resolves to an array with either `[undefined, data]` or `[error]`.
 *
 * @example
 *
 * const [error, data] = await catchError(someAsyncOperation());
 * if (error) {
 *   console.error('An error occurred:', error);
 * } else {
 *   console.log('Operation succeeded with data:', data);
 * }
 */
export const catchError = <T>(promise: Promise<T>): Promise<[undefined, T] | [KyError]> => {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
};
