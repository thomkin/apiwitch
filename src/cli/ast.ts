import { InterfaceDeclaration, Node, SyntaxKind, TypeAliasDeclaration } from 'ts-morph';
import { IterItem, PropertyList } from './types';

export class AstParser {
  private propertyList: PropertyList = {};
  private getTypesRecursively = (node: Node, indentName: string): IterItem | undefined => {
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
          const override: PropertyList = {};
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

  getSchemaFromTypeDeclaration = (
    typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
  ): PropertyList => {
    this.getTypesRecursively(typeDeclaration, 'request');
    return this.propertyList;
  };
}
