import { Schema, SchemaItem } from './types';
import { construct } from 'radash';
import { cliConfig } from '.';

import Mustache from 'mustache';
import prettier from 'prettier';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

export enum ValidBotOutputType {
  request = 'request',
  response = 'response',
}

export class ValibotValidator {
  private childDepth = 0;
  private keyChain: string[] = [];
  private valibodObject: { [key: string]: string } = {};
  private valibotMap: { [key: string]: any } = {};
  private valiBotType: ValidBotOutputType;

  constructor(type: ValidBotOutputType) {
    this.valiBotType = type;
  }

  private createTabs = (numTabs: number): string => {
    return Array(numTabs)
      .fill('')
      .map(() => '  ')
      .join('');
  };

  private removeUnwantedKeys(obj: any, allowedKey: string): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === allowedKey) {
          result[key] = obj[key];
        } else if (typeof obj[key] === 'object') {
          const recursiveResult = this.removeUnwantedKeys(obj[key], allowedKey);
          if (Object.keys(recursiveResult).length > 0) {
            result[key] = recursiveResult;
          }
        }
      }
    }
    return result;
  }

  private iterateOverSchema = (data: any, key: string): any => {
    for (const key in data) {
      this.keyChain.push(key);
      if (typeof data[key] === 'object') {
        //we have more children
        this.childDepth++;
        this.iterateOverSchema(data[key], key);
        this.childDepth--;
      } else {
        console.log(`${this.createTabs(this.childDepth)}::${key} ${this.keyChain}`);
      }
    }

    this.keyChain.pop();
  };

  private propListItemToValibotString = (obj: SchemaItem) => {
    let output = `${!obj.required ? 'v.optional(' : ''}v.${obj.type}()${!obj.required ? ')' : ''}`;
    return output;
  };

  private valibotListToObject = (list: any, required: boolean) => {
    let data = required ? `v.object({` : `v.optional(v.object({`;
    Object.keys(list).forEach((key, idx) => {
      const item = list[key];
      if (idx < Object.keys(list).length - 1) {
        data += `${key}: ${this.createTabs(2)} ${item},\n`;
      } else {
        data += `${key}: ${this.createTabs(2)} ${item}\n`;
      }
    });

    data += required ? '})' : '}))';

    return data;
  };

  private recursiveValibotCreator = (
    data: any,
    indentName: string,
  ): { last: boolean; obj: string | undefined } => {
    const valibotList: any = {};

    for (let i = 0; i < Object.keys(data).length; i++) {
      const key = Object.keys(data)[i];

      if (typeof data[key] === 'object') {
        //its not a finals PropertyListItem so we can go to the next
        const tmpName = indentName.length ? indentName + '.' : '';
        const ret = this.recursiveValibotCreator(data[key], tmpName + key);
        if (ret.obj) {
          valibotList[key] = ret.obj;
        } else if (ret.last) {
          valibotList[key] = this.propListItemToValibotString(data[key]);
        }
      } else {
        //we reached a native type so we can start processing but we have to go one iteration backwards
        return { obj: undefined, last: true };
      }
    }

    this.valibodObject[indentName] = this.valibotListToObject(
      valibotList,
      indentName.endsWith('?') ? false : true,
    );

    return { last: false, obj: this.valibodObject[indentName] };
  };

  addValibotItem = (typeConfig: Schema, uuid: string) => {
    //Remove the top level entry of the list which is either request / response

    const constructedConfig = Object.values(construct(typeConfig))[0];
    const valibot = this.recursiveValibotCreator(constructedConfig, '');
    this.valibotMap[uuid + '_valibot_' + `${this.valiBotType}`] = valibot.obj;
    return;
  };

  private readMustacheTemplate = (name: string): string => {
    const templatePath = path.join(__dirname, 'templates', `${name}.mustache`);
    const template = fs.readFileSync(templatePath, 'utf8');

    return template;
  };

  print = () => {
    console.log(this.valibotMap);
  };

  private toString = () => {
    return Object.keys(this.valibotMap).map((key) => {
      return `${key}: ${this.valibotMap[key]}`;
    });
  };

  generate = async () => {
    const valibotMustacheTemp = this.readMustacheTemplate('routeTypes');

    const data = Mustache.render(valibotMustacheTemp, {
      valibotMap: this.toString(),
      type: this.valiBotType,
    });

    //This is a little hacky we should not included the question marks in the beginning
    //The while flow could be thought trough a little better and improved upon.
    const tmp = data.replace(/\?/g, '');

    const formattedTemplate = await prettier.format(tmp, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      tabWidth: 2,
    });

    const outDir = path.join(process.cwd(), cliConfig.includeDir, 'witchcraft');
    const outValidationPath = path.join(outDir, `${this.valiBotType}.schemas.ts`);
    fs.writeFileSync(outValidationPath, formattedTemplate, { flag: 'w' });

    return formattedTemplate;
  };
}
