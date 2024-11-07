import { Project, ScriptTarget } from 'ts-morph';
import { RoutifyConfig } from './types';
import { getTypeScriptFiles, startTransform } from './parser';
import fs from 'fs';
export let routifyConfig: RoutifyConfig = {} as RoutifyConfig;

export const init = async () => {
  const routifyConfigString = JSON.parse(fs.readFileSync('./routify.config.json', 'utf8'));

  routifyConfig = {
    includes: routifyConfigString.includes,
    apiAddRouterFunc: routifyConfigString.apiRouterFunc,
    librarySearchString: routifyConfigString.librarySearchString,
  };

  //Testing can be removed later !:

  const tsFIles = getTypeScriptFiles();
  console.log('GetTypescriptFiles', tsFIles);
  startTransform('./example/index.ts');
};

init().catch((err) => console.log(err));

// const project = new Project({});

// const src = project.addSourceFileAtPath("./test/apiFunction.ts");

// const personInterface = src.getBaseName()!;
// const one = src.getExportSymbols()!;

// console.log(src.print());
// console.log(src.getChildAtIndex(0).getKindName());
// console.log(src.getChildAtIndex(0).getChildren()[0].getKindName());
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(0).getKindName()
// );
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(1).getKindName()
// );
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(1).getText()
// );
// console.log(
//   "kkk",
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(2).getKindName()
// );
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(3).getKindName()
// );
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(3).getText()
// );
// console.log(
//   src.getChildAtIndex(0).getChildren()[0].getChildAtIndex(4).getKindName()
// );
// console.log(src.getChildAtIndex(1).getKindName());

// const mportClause = src
//   .getChildAtIndex(0)
//   .getChildren()[0]
//   .getChildAtIndex(1)
//   .getText();

// //1. we need to find all children of type ImportDeclaration
// //2. then we have to go troug it to find the StringLiteral which is path to the package
// //3. then we have to find the ImportClause and see if $NAME is imported
// //if it is not imported we can skip the file and go to the next
// //if it is imported we have to find the exported functions that are using the import clause function
// //after that is done we write a new typescript fle where we insert the import statement
// //we also create a wrapper that calls all the files once node is started
// // --> owowowo we have our routes automatically setup - we do not need to do this live but dev server might do this anyway

// // So when we have the function we need to get their input and output types also.
// // we can extract the types, write it into a types.d.ts file, use ts-to-zod and create zod schemas for it
// // then we can create zom wrapper than we can use zod to automate the verification.

// //We end up with a bunch of types and fucntons. We can take the types and create api client out of it also
// //client.${service}.${get}.${exportedFunctionName} --> which will create a request to that api endoint
// //and done, because we generating only types and some tools this can be used with any web framework that understnds typescript
