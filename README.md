# routyfast - A frame work to accelerate TypeScript API development

Welcome, I am routyfast a simple api framework that can speed up the development
process of api implementation. What I can do for you is:

You can use my function _routefastRoute_ to add a callback handler to the
underlying webserver framework. Just create a file. Import the _routyFastRoute_
function.

Look at this example

```ts
import {routyFastRoute} from 'routyfast';

interface Request {
    myItem1: string
    anotherItem: boolean
    oneMore: number //minVal(0) maxVal(100)
}

interface Response {
    code: number
    data: string[]
}

export const myGetHandler = routyFastRoute(<Request, Response>({
        path: "/my/get",
        method: "GET",
        auth: true
    }, async (request: Request): Response => {
        //do your work
        return {} as Response;
    })
)

```

Just create a file, add and interface / type with the name Request and Response.
It will automatically make this function available to the webserver and the best
thing is data validation is happening in the background for you. The Request type
is being used to automatically create validation schemas for valibot which ensure
only correct data is passed in the UI. But everything is happening through the
types, no need to maintain types and schemas separately.

## Authentication handler

Adding authetication handlers is simple. You can have a set of different
auth handlers you want to use for different routes.

```


```

# Under the hood

How this works is:

First we check the configuration for all the directories we should search for
api route files. This is done by finding all files which include and call **routyfastRoute**

If we find any calls to **routyfastRoute** we get the name of the exported function a
nd add it an internal list of all routes that needs to be setup.

Then we export the Request and Respose types from the file. Request and Response
types can have any number of properties. All types are supported except uinion and intersecion types
Union and intersection types should be rarely needed for data transfer objects so this
should not cause to much trouble practically.

An inline comment behind a property of the {Request / Response} {interface / type}
we can tell routyfast a little bit more about the prop.

_in:query_ | 'in:path' | 'in:body' | 'in:header' can be set to tell the routyfast process from
where this element needs to be extracted from. When an http request is received
it automatically extracts that data from the given source and passes it to your callback
routafast auto merges the data from different sources in the request object.
This makes the request object very simple.

The type defintions are also used to autmatically create valibot schemas for input
data validation. The TypeScript type definition is analyzed and a schema is created.
By default it will only check if the type matches. But we can add function names
in the inline comment as well to tell valibot what else we want to verify e.g.
cheking if its a valid email address. Here are some examples. All veribot functions
can be used:

```ts
const req: Request = {
  id: number, //in:path minVal(0) maxVal(1234)
  email: string, //in:body isEmail()
};


//created schemas for id:
v.object(
    id: v.pipe(v.number(), v.minVal(0), v.maxVal(1234)),
    email: v.pipe(v.string(), v.isEmail())
)
```

Type definitions are extracted using the AST. But the AST does not have
information about the comments. So we are reading the files and using regex to
find the comments for each property of the type
