import { ImportSpecifier, NamedImports, Project } from 'ts-morph';
import { AutoGenMethodData, MethodHandler } from '../types';
import { cliConfig, logger } from '.';
import * as ts from 'typescript';
import path from 'path';
import fs from 'fs';
import Mustache from 'mustache';
import prettier from 'prettier';

type MethodHandlerMustache = {
  path: string;
  auth: string;
  method: string;
  callback: string;
  querySelect: string;
  paramSelect: string;
  headerSelect: string;
  bodySelect: string;
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

  private getUUID = (importPath: string, callback: string) => {
    return (
      importPath.replace(/\//g, '_').replace(/\\/g, '_').replace(/\s+/g, '_').replace(/\./g, '_') +
      '_' +
      callback
    ).trim();
  };

  // private createImport = () => {
  //   ts.crea;
  // };

  addAutoGenMethodData = (data: AutoGenMethodData | undefined | null) => {
    if (!data) {
      logger.warn(`input data not defined when calling addAutoGenMethodData`);
      return;
    }

    const uuid = this.getUUID(data.importPath, data.callback);

    console.log('555555555555555 ', data.importPath, uuid);

    //Create the process handler object
    const methodHandlerTemp = this.readMustacheTemplate(this.tempMethodHandler);
    const methodHandlerData: MethodHandlerMustache = {} as MethodHandlerMustache;

    methodHandlerData.bodySelect = JSON.stringify(data.bodySelect || []);
    methodHandlerData.querySelect = JSON.stringify(data.querySelect || []);
    methodHandlerData.paramSelect = JSON.stringify(data.paramSelect || []);
    methodHandlerData.headerSelect = JSON.stringify(data.headerSelect || []);
    methodHandlerData.callback = uuid;
    methodHandlerData.method = JSON.stringify(data.method);
    methodHandlerData.path = JSON.stringify(data.path);
    methodHandlerData.auth = data?.auth ? 'true' : 'false';
    this.methods.push(Mustache.render(methodHandlerTemp, methodHandlerData));

    //Create import lines
    const importTemp = this.readMustacheTemplate(this.tempImport);
    const importData = {} as ImportMustache;
    importData.callback = data.callback;

    const importWithoutExt = data.importPath.replace(/\.[^.]*$/, '');
    importData.includeDir = JSON.stringify(importWithoutExt.replace(cliConfig.includeDir, '..'));
    importData.uuid = uuid;

    console.log('impor data', importData.includeDir, data.importPath);

    this.importLines.push(Mustache.render(importTemp, importData));

    // this.importLines.push(
    //   `import { ${data.callback}  as ${uuid} } from "${}"`,
    // );
  };

  generate = async (outPath: string) => {
    logger.debug(`fileGenerator::create witchcraft file....`);

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

    logger.info('✨🧙‍♀️ Hooray! The witch has successfully completed her latest magic spells! 🌟🔮');
  };
}
