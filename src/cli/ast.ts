import { InputSourceEnum, Schema, SchemaItem, TypeConfigItem } from './types';
import { ErrorCode, logger } from './logger';

import {
  InterfaceDeclaration,
  Node,
  PropertySignature,
  SyntaxKind,
  TypeAliasDeclaration,
  TypeLiteralNode,
} from 'ts-morph';

export class AstParser {
  private rpcRequest: Schema = {
    'RpcRequest.id': { identifier: 'id', isOptional: false, type: 'number', isArray: false },
    'RpcRequest.endpoint': {
      identifier: 'method',
      isOptional: false,
      type: 'string',
      isArray: false,
    },
  };
  private rpcResponse: Schema = {
    'RpcResponse.id': { identifier: 'id', isOptional: false, type: 'number', isArray: false },
    'RpcResponse.error.appCode': {
      identifier: 'error',
      isOptional: true,
      type: 'number',
      isArray: false,
    },
    'RpcResponse.error.message': {
      identifier: 'message',
      isOptional: true,
      type: 'string',
      isArray: false,
    },
  };

  private parsePropertySignature = (
    signature: PropertySignature,
    parentName: string,
    isArray: boolean,
  ): Schema => {
    let propertyMap: { [key: string]: SchemaItem } = {};
    let identifier = '';

    const idf = signature.getFirstChildByKind(SyntaxKind.Identifier);
    if (!idf || !idf.getText()) {
      logger.error(
        ErrorCode.AstParserError,
        `Property signature of type does not have a valid identifier. Please check your type definition.`,
      );
      process.exit(1);
    }

    const finalName = `${parentName}.${idf.getText()}`;

    propertyMap[finalName] = {
      isOptional: false,
      type: 'undefined',
      identifier: 'undefined',
      isArray: isArray,
    };

    propertyMap[finalName].identifier = idf.getText();

    signature.forEachChild((child) => {
      const kind = child.getKindName();
      switch (child.getKind()) {
        case SyntaxKind.BooleanKeyword:
        case SyntaxKind.StringKeyword:
        case SyntaxKind.NumberKeyword:
        case SyntaxKind.AnyKeyword:
        case SyntaxKind.NeverKeyword:
        case SyntaxKind.UndefinedKeyword:
        case SyntaxKind.UnknownKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.ObjectKeyword:
        case SyntaxKind.SymbolKeyword:
        case SyntaxKind.BigIntKeyword:
          propertyMap[finalName].type = child.getText();
          break;

        case SyntaxKind.QuestionToken:
          propertyMap[finalName].isOptional = true;
          break;

        case SyntaxKind.PropertySignature:
          //It will have this if is something like type alfred = {user: {home: sting}}
          //in this case parse the TypeLiteral recursively to find all the other items
          const ret = this.parseTypeLiteral(child as TypeLiteralNode, finalName, false);
          //TODO: when is this needed?
          break;

        case SyntaxKind.TypeLiteral:
          const pm = this.parseTypeLiteral(child as TypeLiteralNode, finalName, false);

          propertyMap = { ...propertyMap, ...pm };
          break;

        case SyntaxKind.ArrayType:
          const arrayType = child.getFirstChildByKind(SyntaxKind.TypeLiteral);
          const at = this.parseTypeLiteral(arrayType as TypeLiteralNode, finalName, true);

          propertyMap = { ...propertyMap, ...at };
          break;

        default:
          break;
      }
    });

    return propertyMap;
  };

  private parseTypeLiteral = (
    typeLiteral: TypeLiteralNode,
    finalName: string,
    isArray: boolean,
  ): Schema => {
    let propertyMap: { [key: string]: SchemaItem } = {};

    typeLiteral.forEachChild((child) => {
      const kind = child.getKindName();
      switch (child.getKind()) {
        case SyntaxKind.PropertySignature:
          propertyMap = {
            ...propertyMap,
            ...this.parsePropertySignature(child as PropertySignature, finalName, isArray),
          };

        default:
          //all other children if they are any will be ignored
          break;
      }
    });

    return propertyMap;
  };

  private mergeRpcRequestParams = (propertyMap: Schema) => {
    let newTypeRet: Schema = {};
    Object.keys(propertyMap).forEach((key) => {
      const newKey = key
        .split('.')
        .map((k, idx) => (idx === 0 ? k : `params.${k}`))
        .join('.');
      newTypeRet[newKey] = propertyMap[key];
      delete propertyMap[key];
    });

    newTypeRet = { ...newTypeRet, ...this.rpcRequest };

    return newTypeRet;
  };

  private mergeRpcResponseResult = (propertyMap: Schema) => {
    let newTypeRet: Schema = {};
    Object.keys(propertyMap).forEach((key) => {
      const newKey = key
        .split('.')
        .map((k, idx) => (idx === 0 ? k : `result.${k}`))
        .join('.');
      newTypeRet[newKey] = propertyMap[key];
      delete propertyMap[key];
    });

    newTypeRet = { ...newTypeRet, ...this.rpcResponse };

    return newTypeRet;
  };

  private parseType = (node: Node, parentName: string): Schema => {
    let schemaMap: { [key: string]: SchemaItem } = {};

    const idf = node.getFirstChildByKind(SyntaxKind.Identifier);
    if (!idf || !idf.getText()) {
      logger.error(
        ErrorCode.AstParserError,
        `Property signature of type does not have a valid identifier. Please check your type definition.`,
      );
      process.exit(1);
    }

    const finalName = `${idf.getText()}`;
    schemaMap[finalName] = {} as SchemaItem;
    schemaMap[finalName].identifier = idf.getText();

    node.forEachChild((child) => {
      const kind = child.getKindName();

      switch (child.getKind()) {
        case SyntaxKind.TypeLiteral:
          //We found a type literal so it means at least the first level of the
          //type is a native type without references
          schemaMap = {
            ...schemaMap,
            ...this.parseTypeLiteral(child as TypeLiteralNode, finalName, false),
          };
          break;
        case SyntaxKind.TypeReference:
          //we have another type assigned to this type , right now we are only supporting
          //if the type name is RpcRequest, or RpcResponse
          const typeName = child.getFirstChildByKind(SyntaxKind.Identifier);
          const typeRet = this.parseType(child, '');

          if (typeName?.getText() === 'RpcRequest') {
            //
            //The return values are the types of the generic <> in the code
            //now we have to map them to the params.
            schemaMap = { ...schemaMap, ...this.mergeRpcRequestParams(typeRet) };
          } else if (typeName?.getText() === 'RpcResponse' || typeName?.getText() === 'RpcReturn') {
            //same as for the response
            schemaMap = { ...schemaMap, ...this.mergeRpcResponseResult(typeRet) };
          }
          break;

        //all other detected types we ignore

        default:
          break;
      }
    });

    //due to the nature of the code above we might have added a property without type defined
    //these do not need to appear in the final output
    schemaMap = Object.keys(schemaMap).reduce((obj, key) => {
      if (schemaMap[key].type !== undefined) {
        obj[key] = schemaMap[key];
      }
      return obj;
    }, {} as Schema);

    return schemaMap;
  };

  private extractInputSource = (
    text: string,
  ): { inputSource: string; cleanText: string; params: string } => {
    const regex = /@(header|query|body|params)(?:\(([^)]*)\))?/;
    const match = text.match(regex);
    const name = match && match[2] ? match[1] : match ? match[1] : null;

    const params = match && match[2] ? match[2].split(',').map((val) => val.trim()) : [];

    const cleanText = match ? text.replace(regex, '') : text;
    return { inputSource: name || '', cleanText, params: params.join(' ') };
  };

  private extractKeyName = (text: string) => {
    const parts = text.split('::');
    return parts[0].trim();
  };

  private getOptionsFromComment = (comment: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(comment))) {
      matches.push(match[1]);
    }
    return matches;
  };

  parseTypeConfigFromComment = (
    typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
    keyPrepend: string,
  ): TypeConfigItem[] | undefined => {
    const blockCommentRegex = /\/\*\*([\s\S]*?)\*\//;
    const match = typeDeclaration.getText().match(blockCommentRegex);

    if (match) {
      const tmp = match[1].replace(/\*/g, '');
      const tmpList = tmp.split('\n').filter((line) => {
        return !line.trim().startsWith('//') && line.trim().length > 0;
      });

      return tmpList.map((line) => {
        const { cleanText, inputSource, params } = this.extractInputSource(line);

        const nameOfKey = keyPrepend + '.' + this.extractKeyName(line);
        const pipe = this.getOptionsFromComment(cleanText);

        const ret: TypeConfigItem = {
          inputSource: {
            params,
            source: inputSource as InputSourceEnum,
            id: this.extractKeyName(line),
          },

          pipe: pipe,
          key: nameOfKey,
        };

        return ret;
      });
    }

    return;
  };

  getSchemaFromTypeDeclaration = (
    typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
    keyPrepend: string,
  ): Schema => {
    const ret = this.parseType(typeDeclaration, keyPrepend);
    Object.keys(ret).forEach((key) => {
      if (ret[key].type === 'undefined') {
        //this is not very nice, better not to add them in the first place
        delete ret[key];
      } else {
        const newKey = key
          .split('.')
          .map((k, idx) => {
            if (idx === 0) {
              return keyPrepend;
            }
            return k;
          })
          .join('.');
        ret[newKey] = ret[key];
        if (newKey !== key) {
          delete ret[key];
        }
      }
    });

    return ret;
  };
}
