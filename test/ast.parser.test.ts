import { expect, test } from 'bun:test';
import { AstParser } from '../src/cli/ast';
import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { cwd } from 'process';
import { Schema } from '../src/cli/types';

const validateSimple = (schema: Schema) => {
  //   console.log(schema);
  expect(schema['request.isValid']).toBeTruthy();
  expect(schema['request.isValid'].isOptional).toBeFalse();
  expect(schema['request.isValid'].identifier).toBe('isValid');
  expect(schema['request.isValid'].type).toBe('boolean');

  expect(schema['request.name']).toBeTruthy();
  expect(schema['request.name'].isOptional).toBeFalse();
  expect(schema['request.name'].identifier).toBe('name');
  expect(schema['request.name'].type).toBe('string');

  expect(schema['request.hasMoutFull']).toBeTruthy();
  expect(schema['request.hasMoutFull'].isOptional).toBeTrue();
  expect(schema['request.hasMoutFull'].identifier).toBe('hasMoutFull');
  expect(schema['request.hasMoutFull'].type).toBe('string');
};

const validateSimpleNested = (schema: Schema) => {
  console.log('Schema', schema);
  expect(Object.keys(schema).length).toBe(2);
};

test('parse-types', () => {
  const ast = new AstParser();
  const project = new Project();

  const dummyFilePath = path.join(cwd(), './test/dummy.types.ts');
  const src = project.addSourceFileAtPath(dummyFilePath);

  src.getChildrenOfKind(SyntaxKind.TypeAliasDeclaration).forEach((child) => {
    const id = child.getFirstChildByKind(SyntaxKind.Identifier);
    let schema: Schema;
    switch (id?.getText()) {
      case 'Simple':
        schema = ast.getSchemaFromTypeDeclaration(child, 'request');
        validateSimple(schema);
        break;

      case 'SimpleNested':
        schema = ast.getSchemaFromTypeDeclaration(child, 'request');
        // validateSimpleNested(schema); TODO: not done yet
        break;

      default:
        break;
    }
  });
});
