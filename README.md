# APIWitch

A powerful TypeScript tool that automatically generates type-safe API routes and clients for web frameworks, just like magic! APIWitch helps you create consistent, well-documented, and type-safe APIs with minimal effort.

## Features

- **Type-Safe Routes**: Automatically generates route handlers with full TypeScript type safety
- **Schema Validation**: Built-in request/response validation using Valibot
- **Framework Agnostic**: Supports multiple web frameworks (currently Elysia, with more coming soon)
- **Client Generation**: Automatically generates type-safe API clients
- **Documentation**: Generates OpenAPI/Swagger documentation
- **RPC Support**: Built-in JSON-RPC protocol support
- **Authentication**: Flexible authentication system
- **Error Handling**: Standardized error handling and logging

## Installation 📦

First, ensure you have Bun installed on your system:

```bash
# Install Bun runtime
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

Then install APIWitch:

```bash
# Using Bun
bun add apiwitch

# Or using npm
npm install apiwitch

# Or using pnpm
pnpm add apiwitch

# Or using yarn
yarn add apiwitch
```

For Elysia framework support, you'll also need to install these dependencies:

```bash
bun add elysia @elysiajs/cors @elysiajs/swagger
```

## Quick Start

1. Create a configuration file `apiwitch.config.json`:

2. Define your API routes in TypeScript:

3. Generate the API:

```bash
apiwitch generate
```

## Defining Routes 🛣️

APIWitch supports both REST and RPC-style routes. Here's how to define them:

### RPC Route Example

```typescript
import { ApiWitchRoute, ApiWitchRouteInput, RpcReturn } from 'apiwitch';

// Define request type (will be automatically validated)
export type Request = {
  name: string;
};

// Define response type (will be automatically validated)
export type Response = {
  id: number;
  name: string;
};

// Define the route handler
export const handler = async (input: ApiWitchRouteInput<Request>): Promise<RpcReturn<Response>> => {
  try {
    // Your business logic here
    const result = await database.create({
      data: { name: input.request.name },
    });

    return {
      result: {
        id: result.id,
        name: result.name,
      },
    };
  } catch (error) {
    return {
      error: {
        code: 'DATABASE_ERROR',
        message: error.message,
      },
    };
  }
};

// Define the route configuration
export const route: ApiWitchRoute = {
  callback: handler,
  endpoint: 'group.create', // RPC method name
  method: 'rpc', // Specify RPC method
  auth: 'default', // Authentication handler to use
  permission: 'admin', // Required permission
};
```

### REST Route Example

```typescript
import { ApiWitchRoute, ApiWitchRouteInput, HttpReturn } from 'apiwitch';

// Define request type with source annotations
export type Request = {
  /**
   * id:: @params  // Get from URL parameters
   * name:: @body  // Get from request body
   * filter:: @query  // Get from query string
   */
  id: string;
  name: string;
  filter?: string;
};

export type Response = {
  id: string;
  name: string;
  createdAt: string;
};

export const handler = async (
  input: ApiWitchRouteInput<Request>,
): Promise<HttpReturn<Response>> => {
  try {
    const result = await database.update({
      where: { id: input.request.id },
      data: { name: input.request.name },
    });

    return {
      statusCode: 200,
      body: {
        id: result.id,
        name: result.name,
        createdAt: result.createdAt,
      },
    };
  } catch (error) {
    return {
      statusCode: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
    };
  }
};

export const route: ApiWitchRoute = {
  callback: handler,
  path: '/groups/:id', // REST path with parameter
  method: 'patch', // HTTP method
  auth: 'default',
  permission: 'admin',
};
```

### Route Configuration Options

The `ApiWitchRoute` interface supports the following options:

```typescript
interface ApiWitchRoute {
  // Required fields
  callback: ApiWitchRouteHandler; // Route handler function
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'rpc'; // HTTP method or RPC

  // Method-specific fields
  path?: string; // REST path (required for HTTP methods)
  endpoint?: string; // RPC method name (required for RPC method)

  // Authentication and Authorization
  auth: string; // Authentication handler name
  permission?: string; // Required permission

  // Optional metadata
  description?: string; // Route description for documentation
  tags?: string[]; // Tags for grouping in documentation
  deprecated?: boolean; // Mark route as deprecated
}
```

### Input Handling

The `ApiWitchRouteInput` provides access to:

```typescript
interface ApiWitchRouteInput<T> {
  request: T; // Validated request data
  meta: {
    // Metadata from auth handler
    userId?: string;
    permissions?: string[];
    [key: string]: any;
  };
  error: (code: number, message: string) => HttpReturn; // Helper for error responses
  redirect: (url: string, status?: number) => HttpReturn; // Helper for redirects
}
```

### Type Safety

APIWitch automatically:

- Validates request data against the `Request` type
- Validates response data against the `Response` type
- Generates TypeScript clients with full type safety
- Creates OpenAPI/Swagger documentation from types

### Best Practices

1. **Type Definition**:

   - Use explicit types for requests and responses
   - Add JSDoc comments for field descriptions
   - Use source annotations for complex data mapping

2. **Error Handling**:

   - Always return typed error responses
   - Use consistent error codes
   - Include helpful error messages

3. **Authentication**:

   - Always specify an auth handler
   - Use appropriate permissions
   - Validate auth in handlers when needed

4. **Documentation**:
   - Add descriptions to routes
   - Use tags for logical grouping
   - Mark deprecated routes

## Project Structure

A typical APIWitch project structure:

```
your-project/
├── apiwitch.config.json
├── src/
│   ├── routes/
│   │   ├── user.ts
│   │   └── auth.ts
│   ├── schemas/
│   │   └── common.ts
│   └── handlers/
│       └── userHandlers.ts
├── generated/
│   ├── routes/
│   ├── client/
│   └── docs/
```

## Configuration ⚙️

APIWitch is configured using `apiwitch.config.json`. Here's a complete configuration file with all available options:

```json
{
  "framework": "elysia",
  "includes": ["./src/routes"],
  "outputDir": "./src/generated",
  "rpc": {
    "enabled": true,
    "prefix": "/rpc",
    "authDomains": ["default", "admin"]
  },
  "auth": {
    "handlers": {
      "default": {
        "type": "bearer",
        "headerName": "Authorization"
      },
      "admin": {
        "type": "basic",
        "headerName": "X-Admin-Auth"
      }
    }
  },
  "validation": {
    "engine": "valibot",
    "generateSchemas": true,
    "schemaOutputDir": "./src/generated/schemas"
  },
  "client": {
    "generate": true,
    "language": "typescript",
    "outputDir": "./src/generated/client",
    "validateResponses": true,
    "bundleTypes": true
  },
  "docs": {
    "generate": true,
    "format": "openapi",
    "outputDir": "./src/generated/docs",
    "title": "My API Documentation",
    "version": "1.0.0",
    "description": "API documentation for my service"
  },
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000"],
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "credentials": true
    },
    "swagger": {
      "enabled": true,
      "path": "/docs/swagger"
    }
  }
}
```

### Configuration Options Explained

#### Core Settings

- `framework` (string, required): The web framework to use. Currently supports `"elysia"`.
- `includes` (string[], required): Array of directories to scan for route definitions.
- `outputDir` (string, required): Directory where generated files will be stored.

#### RPC Configuration

- `rpc.enabled` (boolean): Enable/disable RPC functionality.
- `rpc.prefix` (string): URL prefix for RPC endpoints.
- `rpc.authDomains` (string[]): List of authentication domains for RPC routes.

#### Authentication

- `auth.handlers`: Object defining authentication handlers:
  - `type` (string): Authentication type (`"bearer"` or `"basic"`).
  - `headerName` (string): Custom header name for authentication.

#### Validation

- `validation.engine` (string): Validation engine to use (`"valibot"` default).
- `validation.generateSchemas` (boolean): Auto-generate validation schemas.
- `validation.schemaOutputDir` (string): Output directory for generated schemas.

#### Client Generation

- `client.generate` (boolean): Enable/disable client generation.
- `client.language` (string): Client language (`"typescript"` supported).
- `client.outputDir` (string): Output directory for generated client.
- `client.validateResponses` (boolean): Include response validation in client.
- `client.bundleTypes` (boolean): Bundle type definitions with client.

#### Documentation

- `docs.generate` (boolean): Enable/disable documentation generation.
- `docs.format` (string): Documentation format (`"openapi"` supported).
- `docs.outputDir` (string): Output directory for documentation.
- `docs.title` (string): API documentation title.
- `docs.version` (string): API version.
- `docs.description` (string): API description.

#### Server Configuration

- `server.port` (number): Server port number.
- `server.host` (string): Server host address.
- `server.cors`: CORS configuration:
  - `enabled` (boolean): Enable/disable CORS.
  - `origins` (string[]): Allowed origins.
  - `methods` (string[]): Allowed HTTP methods.
  - `credentials` (boolean): Allow credentials.
- `server.swagger`: Swagger UI configuration:
  - `enabled` (boolean): Enable/disable Swagger UI.
  - `path` (string): Path to serve Swagger UI.

### Environment Variables

You can also use environment variables to override configuration values. Environment variables take precedence over the config file:

```bash
APIWITCH_PORT=5000
APIWITCH_HOST=0.0.0.0
APIWITCH_CORS_ORIGINS=http://localhost:3000,https://myapp.com
```

### Configuration Best Practices

1. **Security**:

   - Always use environment variables for sensitive values
   - Keep authentication configuration separate from code
   - Use strict CORS settings in production

2. **Organization**:

   - Keep route definitions in a dedicated directory
   - Use separate output directories for different generated assets
   - Follow a consistent naming convention for auth domains

3. **Development**:
   - Enable Swagger UI in development for easy API testing
   - Use validation in development and production
   - Keep documentation up to date with API changes

## Adding New Frameworks

APIWitch is designed to be extensible. To add support for a new framework:

1. Create a new directory under `src/frameworks/your-framework`
2. Implement the required interfaces

## Processing Pipeline

APIWitch follows this processing pipeline:

1. **Parsing**: Reads and validates route definitions
2. **Validation**: Checks schema consistency and types
3. **Generation**: Creates framework-specific routes
4. **Client Generation**: Builds type-safe API clients
5. **Documentation**: Generates API documentation

## Error Handling

APIWitch provides standardized error handling:

```typescript
import { ErrorCode } from 'apiwitch';

// Built-in error codes
export enum CoreErrorCodes {
  ValidationError = 'VALIDATION_ERROR',
  AuthenticationError = 'AUTH_ERROR',
  // ...
}

// Custom error handling
try {
  // Your code
} catch (error) {
  logger.error({
    code: CoreErrorCodes.ValidationError,
    message: error.message,
  });
}
```

## License

MIT License - see LICENSE.md for details

Made with ❤️ by the APIWitch team
