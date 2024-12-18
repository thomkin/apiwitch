import { catchError, getTypeScriptFiles, getUUID } from './utils';
import { ValibotValidator, ValidBotOutputType } from './valibot';
import { AutoGenMethodData, ApiMethods } from '../types';
import { RouteFileGenerator } from './fileGenerator';
import { ErrorCode, logger } from './logger';
import { startTransform } from './parser';
import { CliConfig } from './types';

import fs from 'fs-extra';
import { RpcClientGenerator } from './client';

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
    const valibotRequest = new ValibotValidator(ValidBotOutputType.request);
    const valibotResponse = new ValibotValidator(ValidBotOutputType.response);

    const clientGen = new RpcClientGenerator();

    tsFiles.forEach((tsFile) => {
      logger.info(`Parse file ::${tsFile}`);
      const res = startTransform(tsFile);

      if (res) {
        //extract the need config data to create a route
        // const sourceList = mergeSourceLists(res?.request || ({} as any));
        const uuid = getUUID(res?.config.srcPath, res?.config.meta.variableName);

        const methodDateRequest: AutoGenMethodData = {
          callback: res?.config.meta.variableName,
          importPath: res?.config.srcPath,
          endpoint: res?.config.meta.endpoint,
          method: res?.config.meta.method as ApiMethods,
          auth: res?.config.meta.auth,
          bestEffortSelect: res.request.sourceList.bestEffort,
          bodySelect: res.request.sourceList.body,
          headerSelect: res.request.sourceList.header,
          paramSelect: res.request.sourceList.params,
          querySelect: res.request.sourceList.query,
          permission: res.config.meta.permission,
          uuid: uuid,
        };

        rfg.addRoute(methodDateRequest);

        // then add pass information to valibot so that it can generate the schemas
        valibotRequest.addValibotItem(res.request.schema, uuid);
        valibotResponse.addValibotItem(res.response.schema, uuid);

        //push the route information into the client generator so it can do its work
        clientGen.addRouteExport(res.config);
      }
    });

    logger.info('start generating output files...');
    rfg.generate();

    valibotRequest.generate();
    valibotResponse.generate();

    clientGen.generate(cliConfig.clientCopyDir || []);

    logger.info('✨🧙‍♀️ Hooray! The witch has successfully completed her latest magic spells! 🌟🔮');
  } catch (error) {
    console.log(error);
  }
};

run().catch((err) => console.log(err));
