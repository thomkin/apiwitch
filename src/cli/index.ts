import { catchError, getTypeScriptFiles, getUUID, mergeSourceLists } from './utils';
import { RouteFileGenerator } from './fileGenerator';
import { ErrorCode, logger } from './logger';
import { startTransform } from './parser';
import { CliConfig } from './types';
import { construct } from 'radash';
import { ValibotValidator } from './valibot';

import fs from 'fs-extra';
import { AutoGenMethodData, HttpMethods } from '../types';

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
    const valibot = new ValibotValidator();

    console.log(JSON.stringify(tsFiles));

    tsFiles.forEach((tsFile) => {
      logger.info(`Parse file ::${tsFile}`);
      const res = startTransform(tsFile);

      if (res) {
        //extract the need config data to create a route
        const sourceList = mergeSourceLists(res?.request || ({} as any));
        const uuid = getUUID(res?.config.srcPath, res?.config.meta.variableName);

        const methodDateRequest: AutoGenMethodData = {
          callback: res?.config.meta.variableName,
          importPath: res?.config.srcPath,
          path: res?.config.meta.path,
          method: res?.config.meta.method as HttpMethods,
          auth: res?.config.meta.auth,
          bestEffortSelect: sourceList.bestEffort,
          bodySelect: sourceList.body,
          headerSelect: sourceList.header,
          paramSelect: sourceList.params,
          querySelect: sourceList.query,
          uuid: uuid,
        };

        rfg.addRoute(methodDateRequest);

        //then add pass information to valibot so that it can generate the schemas
        valibot.addValibotItem(res.request.propertyList, uuid);
      }
    });

    logger.info('start generating output files...');
    rfg.generate();
    valibot.generate();
    logger.info('✨🧙‍♀️ Hooray! The witch has successfully completed her latest magic spells! 🌟🔮');
  } catch (error) {
    console.log(error);
  }
};

run().catch((err) => console.log(err));
