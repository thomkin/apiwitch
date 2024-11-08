import { catchError, getTypeScriptFiles } from './utils';
import { RouteFileGenerator } from './fileGenerator';
import { ErrorCode, logger } from './logger';
import { startTransform } from './parser';
import { CliConfig } from './types';

import fs from 'fs-extra';

export let cliConfig: CliConfig = { includeDir: '' };

export const run = async () => {
  logger.info('-------------------------------------------------------------------');
  logger.info('Extract the api calls - hold on tight the ride on the broom starts ');
  logger.info('-------------------------------------------------------------------');

  logger.info('read configuration...');
  const [cfgFileErr, configContent] = await catchError(
    fs.readFile('./apiwitch.config.json', 'utf8'),
  );

  if (cfgFileErr) {
    logger.error(ErrorCode.ConfigNotFound, `Not able to find apiwitch.config.json`);
    return;
  }

  try {
    cliConfig = JSON.parse(configContent);

    logger.info('configuration found  and setup, lets go...');

    if (!cliConfig.includeDir || cliConfig.includeDir.length === 0) {
      logger.error(
        ErrorCode.ConfigIncludeDirMissing,
        'includes is not set in the configuration file',
      );
      return;
    }

    //This setting should always be set by the witch not the user because she knows better
    cliConfig.routeAddFctName = 'ApiWitchRoute';

    logger.info('find all typescript files...');
    const tsFiles = getTypeScriptFiles(cliConfig.includeDir);
    const rfg = new RouteFileGenerator();

    tsFiles.forEach((tsFile) => {
      logger.info(`Parse file ::${tsFile}`);
      const methodData = startTransform(tsFile);
      if (methodData) {
        rfg.addAutoGenMethodData(methodData);
      }
    });

    logger.info('start generating output files...');
    rfg.generate();
    logger.info('✨🧙‍♀️ Hooray! The witch has successfully completed her latest magic spells! 🌟🔮');
  } catch (error) {
    console.log(error);
  }
};

run().catch((err) => console.log(err));
