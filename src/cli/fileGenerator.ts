import { AutoGenMethodData } from '../types';
import { logger } from './logger';
import { cliConfig } from '.';

import Mustache from 'mustache';
import prettier from 'prettier';
import path from 'path';
import fs from 'fs';

type MethodHandlerMustache = {
  endpoint: string;
  auth: boolean | string;
  method: string;
  uuid: string;
  callback: string;
  querySelect: string;
  paramSelect: string;
  headerSelect: string;
  bodySelect: string;
  bestEffortSelect: string;
  permission?: string;
};

type ImportMustache = {
  callback: string;
  uuid: string;
  includeDir: string;
};

export class RouteFileGenerator {
  private readonly tempMethodHandler = 'methodHandler';
  private readonly tempWitchcraft = 'witchcraft';
  private readonly tempImport = 'import';

  importLines: string[];
  methods: string[];

  constructor() {
    this.importLines = [];
    this.methods = [];
  }

  private readMustacheTemplate = (name: string): string => {
    const templatePath = path.join(__dirname, 'templates', `${name}.mustache`);
    const template = fs.readFileSync(templatePath, 'utf8');

    return template;
  };

  addRoute = async (data: AutoGenMethodData | undefined | null) => {
    if (!data) {
      logger.warn(`input data not defined when calling addAutoGenMethodData`);
      return;
    }

    //Create the process handler object
    const methodHandlerTemp = this.readMustacheTemplate(this.tempMethodHandler);
    const methodHandlerData: MethodHandlerMustache = {
      bodySelect: JSON.stringify(data.bodySelect || []),
      querySelect: JSON.stringify(data.querySelect || []),
      paramSelect: JSON.stringify(data.paramSelect || []),
      headerSelect: JSON.stringify(data.headerSelect || []),
      bestEffortSelect: JSON.stringify(data.bestEffortSelect || []),

      callback: data.uuid + '.callback',
      method: JSON.stringify(data.method),
      endpoint: JSON.stringify(data.endpoint),
      auth: data.auth ? JSON.stringify(data.auth) : true,
      uuid: JSON.stringify(data.uuid),
    };

    if (data.permission) {
      methodHandlerData.permission = ', permission: ' + JSON.stringify(data.permission);
    }

    this.methods.push(Mustache.render(methodHandlerTemp, methodHandlerData));

    //Create import lines
    const importTemp = this.readMustacheTemplate(this.tempImport);
    const importData = {} as ImportMustache;
    importData.callback = data.callback;

    const importWithoutExt = data.importPath.replace(/\.[^.]*$/, '');
    importData.includeDir = JSON.stringify(importWithoutExt.replace(cliConfig.includeDir, '..'));
    importData.uuid = data.uuid;

    this.importLines.push(Mustache.render(importTemp, importData));

    //create the request and response type files
  };

  generate = async () => {
    const importList = this.importLines.join('\n');
    const handlers = this.methods.join('\n,');

    const witchcraftTemplate = this.readMustacheTemplate(this.tempWitchcraft);
    const witchcraftOut = Mustache.render(witchcraftTemplate, { importList, handlers });

    const formattedTemplate = await prettier.format(witchcraftOut, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      tabWidth: 2,
    });

    const outDir = path.join(process.cwd(), cliConfig.includeDir, 'witchcraft');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outFilePath = path.join(outDir, 'index.ts');
    fs.writeFileSync(outFilePath, formattedTemplate, { flag: 'w' });
  };
}
