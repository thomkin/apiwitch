export const convertString = (s: string | undefined): boolean | number | string | undefined => {
  if (!s) {
    return;
  }

  if (s.toLowerCase() === 'true') return true;

  if (s.toLowerCase() === 'false') return false;
  const num = parseInt(s, 10);
  if (!isNaN(num)) return num;
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
