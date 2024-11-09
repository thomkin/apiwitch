import * as Codegen from '@sinclair/typebox-codegen';
import { Type, type Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

import { AutoGenMethodData } from '../types';
import { logger } from './logger';
import { cliConfig } from '.';

import Mustache from 'mustache';
import prettier from 'prettier';
import path from 'path';
import fs from 'fs';
import { ValibotValidator } from './validation';

type MethodHandlerMustache = {
  path: string;
  auth: boolean | string;
  method: string;
  callback: string;
  querySelect: string;
  paramSelect: string;
  headerSelect: string;
  bodySelect: string;
  bestEffortSelect: string;
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
  private val = new ValibotValidator();

  constructor() {
    this.importLines = [];
    this.methods = [];
  }

  private readMustacheTemplate = (name: string): string => {
    const templatePath = path.join(__dirname, 'templates', `${name}.mustache`);
    const template = fs.readFileSync(templatePath, 'utf8');

    return template;
  };

  private getUUID = (importPath: string, callback: string) => {
    return (
      importPath.replace(/\//g, '_').replace(/\\/g, '_').replace(/\s+/g, '_').replace(/\./g, '_') +
      '_' +
      callback
    ).trim();
  };

  addAutoGenMethodData = async (data: AutoGenMethodData | undefined | null) => {
    if (!data) {
      logger.warn(`input data not defined when calling addAutoGenMethodData`);
      return;
    }

    //construct a uniqe id for the naming the created method handler
    const uuid = this.getUUID(data.importPath, data.callback);

    this.val.addValibotItem(data.rawSchemaRequest, uuid);

    //Create the process handler object
    const methodHandlerTemp = this.readMustacheTemplate(this.tempMethodHandler);
    const methodHandlerData: MethodHandlerMustache = {} as MethodHandlerMustache;

    methodHandlerData.bodySelect = JSON.stringify(data.bodySelect || []);
    methodHandlerData.querySelect = JSON.stringify(data.querySelect || []);
    methodHandlerData.paramSelect = JSON.stringify(data.paramSelect || []);
    methodHandlerData.headerSelect = JSON.stringify(data.headerSelect || []);
    methodHandlerData.bestEffortSelect = JSON.stringify(data.bestEffortSelect || []);
    methodHandlerData.callback = uuid + '.callback';
    methodHandlerData.method = JSON.stringify(data.method);
    methodHandlerData.path = JSON.stringify(data.path);
    methodHandlerData.auth = data.auth ? JSON.stringify(data.auth) : true;
    this.methods.push(Mustache.render(methodHandlerTemp, methodHandlerData));

    //Create import lines
    const importTemp = this.readMustacheTemplate(this.tempImport);
    const importData = {} as ImportMustache;
    importData.callback = data.callback;

    const importWithoutExt = data.importPath.replace(/\.[^.]*$/, '');
    importData.includeDir = JSON.stringify(importWithoutExt.replace(cliConfig.includeDir, '..'));
    importData.uuid = uuid;

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

    const validationFileRaw = await this.val.getTypeScript();
    const outValidationPath = path.join(outDir, 'validation.ts');
    fs.writeFileSync(outValidationPath, validationFileRaw, { flag: 'w' });
  };
}
