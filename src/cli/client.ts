import { Project } from 'ts-morph';
import { ApiWitchRouteExport } from './types';
import path from 'path';
import fs from 'fs-extra';
import Mustache from 'mustache';
import { ApiMethods } from '../types';
import { cliConfig } from '.';
import { camel, construct } from 'radash';
import prettier from 'prettier';

interface MustacheHandleData {
  request: string;
  response: string;
  requestName: string;
  responseName: string;
  authDomain: string;
  endpoint: string;
}

interface MustacheIndexData {
  imports: string;
  clientTypes: string;
  handler: string;
}
interface MustacheImportData {
  alias: string;
  source: string;
}

export class RpcClientGenerator {
  private routes: ApiWitchRouteExport[] = [];
  private imports: string[] = [];
  private clientType: string[] = [];

  addRouteExport = (route: ApiWitchRouteExport) => {
    if (route.meta.method === ApiMethods.rpc) {
      this.routes.push(route);
    }
  };
  clear = () => {
    this.routes = [];
  };

  private readMustacheTemplate = (name: string): string => {
    const templatePath = path.join(__dirname, 'templates', 'client', `${name}`);
    const template = fs.readFileSync(templatePath, 'utf8');

    return template;
  };

  generate = async () => {
    const outDir = path.join(process.cwd(), cliConfig.includeDir, 'witchcraft');
    const clientDir = path.join(outDir, 'client');
    const endpointDir = path.join(clientDir, 'endpoints');

    //<req, resp>(data: req) => Promise<resp>
    const typeMap: { [key: string]: string } = {};
    const handlerMap: { [key: string]: string } = {};

    fs.removeSync(clientDir);
    fs.mkdirSync(clientDir, { recursive: true });
    fs.mkdirSync(endpointDir, { recursive: true });

    //read the exported routes and generate a client for it
    this.routes.forEach((route) => {
      const project = new Project();
      const src = project.addSourceFileAtPath(route.srcPath);

      //create handler file
      const mustacheHandlerTempl = this.readMustacheTemplate('handler.mustache');
      const handlerData: MustacheHandleData = {
        authDomain: route.meta.auth as string,
        endpoint: route.meta.endpoint,
        request: `export ${src.getTypeAlias('Request')?.getText()}`,
        response: `export ${src.getTypeAlias('Response')?.getText()}`,
        requestName: 'Request',
        responseName: 'Response',
      };

      const handlerFile = path.join(endpointDir, `${route.meta.endpoint}.ts`);
      fs.writeFileSync(handlerFile, Mustache.render(mustacheHandlerTempl, handlerData));

      //going to create the imports for the index file
      const aliasName = camel(route.meta.endpoint.replaceAll('.', ' '));
      const mustacheImportTempl = this.readMustacheTemplate('import.mustache');
      const importData: MustacheImportData = {
        alias: aliasName,
        source: `./endpoints/${route.meta.endpoint}`,
      };

      this.imports.push(Mustache.render(mustacheImportTempl, importData));

      //   this.imports.push(`import { handlerMap as ${aliasName}_map }`);
      //   this.clientType.push(`...${aliasName}_map,`);

      typeMap[route.meta.endpoint] =
        `(data: ${aliasName}_request) => Promise<RpcReturn<${aliasName}_response>>;`;

      handlerMap[route.meta.endpoint] = `${aliasName}_handler`;
    });

    //create the index.ts file
    const mustacheIndexTempl = this.readMustacheTemplate('index.mustache');
    const indexTemplData: MustacheIndexData = {
      imports: this.imports.join('\n'),
      clientTypes: JSON.stringify(construct(typeMap)).replaceAll('"', '').replaceAll(';,', ';'),
      handler: JSON.stringify(construct(handlerMap)).replaceAll('"', ''),
      //   clientTypes: this.clientType.join('\n'),
    };

    const formattedTemplate = await prettier.format(
      Mustache.render(mustacheIndexTempl, indexTemplData),
      {
        parser: 'typescript',
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 80,
        tabWidth: 2,
      },
    );

    const indexFile = path.join(clientDir, `index.ts`);
    fs.writeFileSync(indexFile, formattedTemplate);

    //copy the kyLibrary template into the client
    const templateClientDir = path.join(__dirname, 'templates', 'client');
    const tsFiles = fs.readdirSync(templateClientDir).filter((file) => file.endsWith('.ts'));

    tsFiles.forEach((file) => {
      const filePath = path.join(templateClientDir, file);
      const destFilePath = path.join(clientDir, file);

      fs.copyFileSync(filePath, destFilePath);
    });
  };
}
