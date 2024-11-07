import { Type } from '@sinclair/typebox';
import * as v from '@badrap/valita';

import * as fs from 'fs';

export const getTypeScriptFiles = (includes: string[]) => {
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

  includes?.forEach((include) => addTsFiles(include));
  return tsFiles;
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
