import fs from 'fs-extra';
import { catchError, getTypeScriptFiles } from './utils';
import { CliConfig } from './types';
import { startTransform } from './parser';

import winston from 'winston';
import { RouteFileGenerator } from './fileGenerator';
const { combine, timestamp, label, prettyPrint, colorize, simple } = winston.format;

export let cliConfig: CliConfig = { includeDir: '' };

export const logger = winston.createLogger({
  level: 'info',
  format: combine(prettyPrint(), colorize(), simple()),
  transports: [new winston.transports.Console({ level: 'debug' })],
});

export const run = async () => {
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

    if (!cliConfig.includeDir || cliConfig.includeDir.length === 0) {
      logger.error('includes is not set in the configuration file');
      throw new Error('includes is not set in the configuration file');
    }

    //This setting should always be set by the witch not the user because she knows better
    cliConfig.routeAddFctName = 'ApiWitchRoute';

    const tsFiles = getTypeScriptFiles(cliConfig.includeDir);
    logger.debug('Found the following ts files to analyze for routes', tsFiles);

    const rfg = new RouteFileGenerator();

    tsFiles.forEach((tsFile) => {
      logger.debug(`ProcessFIle::${tsFile}`);
      const methodData = startTransform(tsFile);
      logger.debug(
        `We prepared everything to start the creation of the auto generated files ${JSON.stringify(
          methodData,
          null,
          2,
        )}`,
      );

      rfg.addAutoGenMethodData(methodData);
    });

    rfg.generate('');
  } catch (error) {
    logger.error(error);
  }
};

run().catch((err) => console.log(err));
