import fs from 'fs-extra';
import { catchError, getTypeScriptFiles } from './utils';
import { CliConfig } from './types';
import { startTransform } from './parser';

import winston from 'winston';
const { combine, timestamp, label, prettyPrint, colorize, simple } = winston.format;

export let cliConfig: CliConfig = {};

export const logger = winston.createLogger({
  level: 'info',
  format: combine(prettyPrint(), colorize(), simple()),
  transports: [new winston.transports.Console({ level: 'debug' })],
});

const run = async () => {
  logger.info('-------------------------------------------------------------------');
  logger.info('Extract the api calls - hold on tight the ride on the broom starts ');
  logger.info('-------------------------------------------------------------------');

  const [cfgFileErr, configContent] = await catchError(
    fs.readFile('./apiwitch.config.json', 'utf8'),
  );

  logger.debug(`configuration --> ${configContent}`);

  if (cfgFileErr) {
    // logger.error('Not able to find apiwitch.config.json ...');
    throw new Error('could not find config file');
  }

  try {
    cliConfig = JSON.parse(configContent);

    //This setting should always be set by the witch not the user because she knows better
    cliConfig.routeAddFctName = 'ApiWitchRoute';

    const tsFiles = getTypeScriptFiles(cliConfig.includes || ['./src']);
    logger.debug('Found the following ts files to analyze for routes', tsFiles);

    tsFiles.forEach((tsFile) => {
      logger.debug(`ProcessFIle::${tsFile}`);
      startTransform(tsFile);
      // logger.debug(`#######################ProcessFIle::${tsFile}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

run().catch((err) => console.log(err));
