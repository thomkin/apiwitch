Assumption:
we only spport JSON data not other formats! application/json

```ts
type Meta = {
  startTime: number;
  bucketId: number;
};

type Request = {
  id: string; //@query
  name: string; //@body
  isEnabled: boolean; //@params
  cacheHead: string; //@header(xmt-cache-no)
  meta: Meta; //@body
  oldMeta: Meta; //@query --> When o
};
```

When other types are being used the whole object must be taken from the same input source.

Now when a request comes from the user it contains basically 4 major sources of data:

1. Path items (GET DELETE UPDATE)
2. Query parameters (GET)
3. body parameters (POST | PATCH)
4. headers (any http method)

So we need to define the source of an object. E.g. the meta property of the Request
type is supposed to come from the body. So the body must have an object with the name
meta which must have the keys startTime and bucketId.

Lets look at all the cases, simple first the scalar types number, string, boolean, date
all of them are very simple to match

- take the key of the property in the type e.g. id. Look into the query parameters and check if we have
  one with the name id. If so copy it, if not set the value to undefined.

But the same applies to objects also,f e.g. for meta go into the body and get
and check if it contains data for meta.

So for all types it works the same. That is good.
What is the issue then?

we can simply go through the raw map type from top to bottom.
We traverse all objects recursivly. The first object that has an
source parameter defined determines the name and from where it should be sourced.

```json
 "Request": {
    "isActive": {
      "key": {
        "type": "string",
        "comment": "what do you want @query"
      },
      "value": {
        "type": "string"
      }
    },
    "test": {
      "my": {
        "type": "string",
        "comment": "undefined"
      }
    }
  }
```

Right now the comment is only read from final components but it should be added
for all items.

Task 1: make sre that every node has an item comment
-- that seems to be solved. So only the main parameters are considered not commentd
from the child type if spefid as another type

What next? We are saving this comment data as a string but we could parse it
and put it into a propper data structure:

We have implemented this only source selection for now other things like type validation things we can look at alter
for now we use validation only on types not on values

```

```
