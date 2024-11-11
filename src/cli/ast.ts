import { InterfaceDeclaration, Node, SyntaxKind, TypeAliasDeclaration } from 'ts-morph';
import { InputSourceEnum, Schema, SourceList, TypeConfigItem } from './types';

export class AstParser {
  private propertyList: Schema = {};

  private getTypesRecursively = (node: Node, indentName: string): undefined => {
    const typeLiterals = node.getFirstChildByKind(SyntaxKind.TypeLiteral);

    if (!typeLiterals) {
      //we have come to the last type definitions in this branch so we can go back and check out other branches
      return;
    }

    const propertySignatures = typeLiterals.getChildrenOfKind(SyntaxKind.PropertySignature);
    if (propertySignatures.length === 0) {
      //the node does have any properies any more so we can go back
      return;
    }

    //We have some properties so we can extract the type data
    propertySignatures.forEach((property) => {
      const identifier = property.getFirstChildByKind(SyntaxKind.Identifier);
      const type = identifier?.getType().getText();
      const name = identifier?.getText();
      const typeLiteral = property.getFirstChildByKind(SyntaxKind.TypeLiteral);
      const question = property.getFirstChildByKind(SyntaxKind.QuestionToken)?.getText();

      if (typeLiteral) {
        //there is another type literal as the child so follow that first
        this.getTypesRecursively(property, indentName + '.' + name);

        if (question) {
          const override: Schema = {};
          Object.keys(this.propertyList).forEach((key) => {
            if (key.startsWith(indentName + '.' + name)) {
              const tmpKey = key
                .replace(indentName + '.' + name, indentName + '.' + name + '?')
                .replace('??', '?'); //That's a little ugly but to ensure we cannot get two ??
              override[tmpKey] = this.propertyList[key];
            } else {
              //copy data as is
              override[key] = this.propertyList[key];
            }
          });

          this.propertyList = override;
        }
        return;
      } else {
        const question = property.getFirstChildByKind(SyntaxKind.QuestionToken)?.getText();

        this.propertyList[indentName + '.' + name] = {
          name: name || 'unknown',
          required: question ? false : true,
          type: type || 'unknown',
        };
      }
    });
  };

  private getSourceList = (sourceName: string, name: string, parameters: string): SourceList => {
    //We need to strip the first element from the name as it refers to the type name in TS code which is not
    //needed for further processing
    const nameParts = name.split('.');
    if (nameParts.length > 1) {
      name = nameParts.slice(1).join('.');
    }

    switch (sourceName) {
      case 'header':
        return {
          body: [],
          params: [],
          header: [name + ' ' + parameters],
          query: [],
          bestEffort: [],
        };

      case 'query':
        return {
          body: [],
          params: [],
          header: [],
          query: [name],
          bestEffort: [],
        };

      case 'params':
        return {
          body: [],
          params: [name],
          header: [],
          query: [],
          bestEffort: [],
        };

      case 'body':
        return {
          body: [name],
          params: [],
          header: [],
          query: [],
          bestEffort: [],
        };

      default:
    }

    return {
      body: [],
      params: [],
      header: [],
      query: [],
      bestEffort: [name],
    };
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
    this.getTypesRecursively(typeDeclaration, keyPrepend);
    return this.propertyList;
  };
}
