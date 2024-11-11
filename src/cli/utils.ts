import * as fs from 'fs';

/**
 * This function takes a directory path and returns an array of paths to all
 * the typescript files in that directory and any subdirectories.
 * @param includeDir the directory to start searching for typescript files
 * @returns an array of paths to all the typescript files
 */
export const getTypeScriptFiles = (includeDir: string) => {
  const tsFiles: string[] = [];
  const addTsFiles = (dirPath: string) => {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = `${dirPath}/${file}`;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        addTsFiles(filePath);
      } else if (file.endsWith('.ts')) {
        tsFiles.push(filePath);
      }
    });
  };

  addTsFiles(includeDir);
  return tsFiles;
};

/**
 * Given a promise, this function will catch any errors that are thrown
 * and return a promise that resolves to an array with either:
 * - [undefined, data] if the promise resolves successfully
 * - [error] if the promise rejects
 *
 * This is useful for handling errors in a functional style.
 *
 * @param promise - the promise to be wrapped
 * @returns a promise that resolves to an array with either [undefined, data] or [error]
 */

export const catchError = <T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> => {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
};

/**
 * This function takes a ProcessTypeResult and merges all the source lists together.
 * It returns a single SourceList with all the merged data.
 *
 * @param data - The data object with the typeConfig as a property
 * @returns A single SourceList with all the merged data.
 */
// export const mergeSourceLists = (data: ProcessTypeResult) => {
//   let finalSrcList = {
//     body: [],
//     params: [],
//     header: [],
//     query: [],
//     bestEffort: [],
//   } as SourceList;

//   if (!data.typeConfig) {
//     return finalSrcList;
//   }

//   Object.keys(data.typeConfig).forEach((key) => {
//     finalSrcList.bestEffort = [
//       ...finalSrcList.bestEffort,
//       ...data.typeConfig[key].sourceList.bestEffort,
//     ];

//     finalSrcList.body = [...finalSrcList.body, ...data.typeConfig[key].sourceList.body];
//     finalSrcList.header = [...finalSrcList.header, ...data.typeConfig[key].sourceList.header];
//     finalSrcList.params = [...finalSrcList.params, ...data.typeConfig[key].sourceList.params];
//     finalSrcList.query = [...finalSrcList.query, ...data.typeConfig[key].sourceList.query];
//   });

//   return finalSrcList;
// };
export const getUUID = (importPath: string, callback: string) => {
  return (
    importPath.replace(/\//g, '_').replace(/\\/g, '_').replace(/\s+/g, '_').replace(/\./g, '_') +
    '_' +
    callback
  ).trim();
};

export function isNativeType(s: string): boolean {
  const knownNativeTypes = [
    'any',
    'number',
    'string',
    'boolean',
    'symbol',
    'undefined',
    'null',
    'void',
    'never',
    'unknown',
    'object',
    'Date',
    'date',
  ];

  return knownNativeTypes.includes(s);
}
