# api witch - make API development a witchy experience

apiwitch is a small TypeScript library that tends to speed up api development

- Auto creation of validation schemas from the defined request / response types
- Single file routes implementation - no need to setup any routers. Routes are auto detected
- Automatic creation of TypeSCript client including validation of the returned data [work in progress]

- Uses valiBot for verification
- ./cli directory contains files that analyze Typescript files and create the routes and schemas
- Not depending on a specific framework but right now only implemented support for Bun:Elysia framework
- AST is used to parse typescript files to get all details to find out where routes are defined

- inspired by encore but leaves you much more freedom. Use what ever api framework
  you want to use, what every kind of data base you want or package you want to include.

## Installation

Add the package as a git repo. Right now the package is not available as NPM package.

```bash
bun create elysia app
cd ./app

pnpm add https://github.com:thomkin/apiwitch.git
pnpm install
```

Add the following configuration:

1. includes: directories were we search for exported routes
2. outputDir: a directory where the auto generated files will be stored

```bash
touch apiwitch.config.json
vim apiwitch.config.json
```

```json
{
  "includes": ["./example"],
  "outputDir": "./src/witchcraft"
}
```

Add the following scripts to your package.json file. This will allow you to
generate the route and schema configuration files.

```json
    {
        "scripts": {
            "apiwitch": "bun run ts-node ./node_modules/apiwitch/src/cli/index.ts"
            ....
        }
    }
```

Here is a small example app:

```TypeScript
import { AuthHandler, AuthReturn, FrameworkId, apiwitchInit } from "apiwitch";

//Include auto generated files to pass it to the apiwitch.
//Auto generated files are static and can be version controlled.
import { WitchcraftSchemas } from "./witchcraft/validation";
import { WitchcraftRoutes } from "./witchcraft";

const defaultAuth = (authorization: string | undefined): AuthReturn => {
  console.log("Authorization", authorization);
  return {
    //Return and error message to stop the user from accessing the route
    //meta can contain any other data you want e.g. user data extracted from the token
    // error: {
    //   message: "hey thomas do not come in!",
    // },
    meta: { userId: Math.random() },
  };
};

//Set up a auth handler
const authHandlerMap: Map<string, AuthHandler> = new Map();
authHandlerMap.set("default", defaultAuth);

//configure and run the serer, right now only elysia framework is supported
const run = async () => {
  apiwitchInit({
    frameworkId: FrameworkId.elysia,
    frameworkConfig: {
      cors: { origins: ["http://localhost:3000/*"] },
      port: 5000,
      swagger: {
        path: "/devel/swagger",
      },
    },
    witchcraftRoutes: WitchcraftRoutes,
    witchcraftSchemas: WitchcraftSchemas,
    authHandlerMap: authHandlerMap,
  });
};

run();
```

# Route Configuration

Routes are automatically detected by analyzing all .ts files found in the include
dirs configuration. Let us look at how a route file needs to be setup.

```typescript
type Request = {
  id: string;
  isValid: boolean;
  user: {
    name: string;
    phone: string;
    age?: number;
  };
};

type Response = {
  id: string;
  firstName: string;
  lastName: string;
  code: number;
};

//  This is how a callback is defined
// export type ApiWitchRouteInput<req> {
//   request: req;
//   error: (code: number, message: string) => any;
//   redirect: (url: string, status: 301 | 302 | 303 | 307 | 308 | undefined) => any;
//   meta: { [key: string]: any };
// }
// export type ApiWitchRouteHandler = <req, res>(input: ApiWitchRouteInput<req>) => Promise<res>;
//
const getUser: ApiWitchRouteHandler = async <Request, Response>(
  input: ApiWitchRouteInput,
): Promise<Response> => {
  //... do something

  //This will send the error back to the requester when error was detected
  if (error) {
    return input.error(HttpErrorCode.BadRequest, {
      message: error?.message,
      code: CoreErrorCodes.ValidationFailed,
    } as HttpErrorMsg);
  }

  //id you want to redirect to somewhere else
  if (redirect) {
    return input.redirect('github.com', 301);
  }

  //send your data back to the requester
  return {} as Response;
};

export const getUserRoute: ApiWitchRoute = {
  callback: getUser,
  method: 'post',
  path: '/testing',
  auth: 'default',
};
```

That's all it is.

- Define two types, one with the name **Request** one with **Response** (spelling is important !!! )
  - They can be constructed which ever way you want but it cannot resolve non native types right now
  - Type definition will be used for data validation (no need to setup anything if only types are checked)
  - See [Request and Response Types](#request-and-response-types)
- Crate a callback handler that is executed when the route is hit. The name of the callback handler does not matter
  - error(): call this function and return its value if you want to send an error message to the client
  - redirect(): call this function and return its value if you want to redirect
  - meta: a user defined value that could be set in other places e.g. when authorization is happening extract user ids from token etc.
  - request: this is the data from the request. See [How request data is constructed](#how-request-data-is-constructed) for more details
- Last thin is export an object of type ApiWitchRoute
  - Method: can be get / delete / post / patch (case insensitive so use what ever you want)
  - path: route path (uses router frameworks path features for Elysia you can use :id to extract params from url)
  - auth: define which auth handler should be used. Must be a string, if auth handler is not implemented route will not be accessible

### How request data is constructed

When a handler for a route is executed it gets only a single object containing all
data needed. Generally data is send as headers, body data, query data, or url parameters.
The framework automatically resolves from where each element of the request should get its
data. But you can also define the source specifically for a property.

- GET routes
  - For get routes we first check in parameter data and then in the query data.
    If we do not find the value there it will be set to undefined. We never search in query or header data.
- POST routes
  - we check in parameters and then body, never in query or headers
- PATCH:
  - the same as POST
- DELETE
  - the same as GET

If you want to specify specific data sources for a specific property you can
add a block comment inside the type definition:

```typescript
type Request = {
  /**
   * user.name:: @body {minLength(123)}
   * user.phone:: @query {email()}
   * id:: @params
   * myHeader:: @header(HEADER-NAME) --> not this is prepared but not implemented yet
   */
  id: number;
  myHeader: string;
  user: {
    name: string;
    phone?: boolean;
  };
};
```

### Request and Response Types

Request and Response types are used for data validation. Right now only validation of
their types is implemented, and parameters can be optional or required. Best to
avoid using custom data types as it is not yet able to resolve those types automatically

You can either use the **type** or **interface** keywords.

# TODO

- [ ]Bug 001: Best effort values are not set when there is no configuration in the block comment
  The problem is this: In the parseTypeCommentConfig we are creating the list for body, query, params, header select
  but here we do not have the data of who is not theres

AST is getting type data and we need to iterate through the list of all types we have found
remove the inputs that have ben already added to some of the arrays and we will be left
with a list of best effort.

We can also create an object of the reqeust itterate over all the keys and check
if they are not in any list we push them into best effort.

AST output is used to the type definition, the schema, the string parse is used to get
the configuration from the commmetns. CAn we not add the parseTypeCOmmentConfig to the ast class?

We are calling the astPArser.getSCheamFromTypeDEclration function which returns
the propery list -> is he schema.

So when we return this list we can also return the SourceList

- [ ] Features 002: add the creation of different files for schema for request and response objects

//TODO: an empty Request does not work !!! that needs to change!!!
