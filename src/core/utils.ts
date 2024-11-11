/**
 * Converts a string to a boolean, number, Date, or string if possible.
 * Otherwise, returns the original string.
 * @param s the string to convert
 * @returns a boolean, number, Date, or string
 */
export const convertString = (
  s: string | undefined,
): boolean | number | Date | string | undefined => {
  if (!s) {
    return;
  }

  if (s.toLowerCase() === 'true') return true;

  if (s.toLowerCase() === 'false') return false;
  const num = parseInt(s, 10);
  if (!isNaN(num)) return num;

  const date = Date.parse(s);
  if (!isNaN(date)) return new Date(date);

  return s;
};

export const catchError = <T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> => {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
};
