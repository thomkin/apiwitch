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

## Client creation

TODO: at some point it would be nice if it could create client libraries
for the specified routes as well including data validation .

# RPC

Apiwitch has an RPC endpoint that can be used to send JSON RPC like messages
This can be usefull in cases where rpc interface makes more sense than a standard rest api.

A RPC interface ahs the following pros:

- all data comes in the body
- everything is a POST message
- user non HTTP interfaces like Redis pubsub for inter services comunication on a single machine

Disadvantages:

- we need to implement the routing by ourselves and cannot use the frameworks router capabilities.

For the HTTP routes apiwitch support setting up multiple auth handlers.
We should be reusing the same function so that we do not have to test more code.

The Rpc Request and response types are defined like this:

```ts
export type RpcRequest<T> = {
  id: number;
  method: string;
  authDomain: string; //auth domain that shall be used (different methods can be accessible with different auth mechanisms)
  token: string; //format similar to HTTP auth header --> Basic|Bearer token
  params: T;
};

export type RpcResponse<T> = {
  id: number; //the id from the request would not be needed for HTTP but might be needed for PubSub
  result?: T; //data depending on the request made
  error?: {
    appCode: number; //an application error code that could be used to query more information about the error
    message: string; //a short message should not be too long
  };
};
```

Configuring a route also happens with ApiWitchRoute only thing is that the method
is set to "rpc". For each of the auth handlers that are added we are creating
a separate rpc endpoint so that we can use the different auth mechanisms needed
for the application. we add the name of the auth method to the rpc url. E.g. let us say
the name of the auth is "default" than we can access the default route rpc handlers with
**/rpc/default** The problem with this is the callback for the route needs to know
wich routes it can access (only those for a specific auth handler). And authentication
parameters would need to be send over the http headers which would work against the idea
of having it work on pubsub systems. So we register only a single rpc.

I need to tell:

1. which function to use to authenticate which authentication theme Bearer of Basic and the token

# TODO

- [] Check why interface do not work as Route parameters. It would be best if
  we can make them work also because this would make the implementation of easier sometimes

- [] in the rpc client instead of parsing the config store as a parameter als have a function updateOrCreate
  and delte to update/create or delete an alement in the token store

- In this ts snippe the assignment of an object to a spefici input here query does not seem to work
  it still ends up in best effort

```ts
type Request = {
  /**
   * formData:: @query TODO:
   */
  formData: {
    email: string;
    name: string;
    region: string;
    city: string;
    feedback: string;
    deviceInfo: {
      os: string;
      browser: string;
      userAgent: string;
    };
  };
};
```
