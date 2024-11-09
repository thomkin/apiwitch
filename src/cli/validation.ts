import path from 'path';
import fs from 'fs';
import Mustache from 'mustache';
import prettier from 'prettier';

export class ValibotValidator {
  private childDepth = 0;
  private keyChain: string[] = [];

  private valibotMap: { [key: string]: any } = {};

  constructor() {}

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
    console.log(`${this.createTabs(this.childDepth)}::${key} ${this.keyChain}`);

    for (const key in data) {
      this.keyChain.push(key);
      if (typeof data[key] === 'object') {
        //we have more children

        // this.filtered[key] = {};
        this.childDepth++;
        this.iterateOverSchema(data[key], key);
        this.childDepth--;
      } else {
        console.log(`${this.createTabs(this.childDepth)}::${key} ${this.keyChain}`);
      }
    }

    this.keyChain.pop();
  };
  //TODO: right now all fields are optional but would be better to get this form the code
  private convertObjectToValibotString = (obj: any) => {
    console.log('obje', obj);
    let output = 'v.optional(v.object({';

    Object.keys(obj).forEach((key, idx) => {
      if (idx < Object.keys(obj).length - 1) {
        output += `${key}: ${obj[key]},`.replace(',,', ','); //with comma
      } else {
        output += `${key}: ${obj[key]}`;
      }
    });

    return output + '}))';
  };

  private recursiveValibotCreator = (data: any) => {
    console.log('data', data);
    for (let i = 0; i < Object.keys(data).length; i++) {
      const key = Object.keys(data)[i];

      if (data?.[key].type) {
        if (i < Object.keys(data).length - 1) {
          data[key] = `v.optional(v.${data?.[key].type}()),`.replace(',,', ',');
        } else {
          data[key] = `v.optional(v.${data?.[key].type}())`;
        }
      } else {
        const ret = this.recursiveValibotCreator(data[key]);
        data[key] = ret;
      }
    }

    const tmp = this.convertObjectToValibotString(data);

    return tmp;
  };

  addValibotItem = (rawSchemaRequest: any, uuid: string) => {
    const typesOnly = this.removeUnwantedKeys(rawSchemaRequest, 'type');
    const valibot = this.recursiveValibotCreator(typesOnly['Request']);
    this.valibotMap[uuid] = valibot;

    // console.log('valibot object', valibot);
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
      return `${key}: ${this.valibotMap[key]}\n`;
    });
  };

  getTypeScript = async () => {
    const valibotMustacheTemp = this.readMustacheTemplate('routeTypes');

    const data = Mustache.render(valibotMustacheTemp, {
      valibotMap: this.toString(),
    });

    const formattedTemplate = await prettier.format(data, {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      tabWidth: 2,
    });
    return formattedTemplate;
  };
}
