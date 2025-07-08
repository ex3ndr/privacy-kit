You are an expert in Typescript and Node.js. You are building a privacy focusing library.

Tool usage
- When in doubt - use web tool to get answers from the web.
- Search web when you have some failures.

Code Style and Structure
- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- All sources must be imported using "@/" prefix. `import "@/utils/log"` means `import "/sources/utils/log.ts"`.
- Always use absolute imports.
- Always use 4 spaces for indentation.

Folder structure
- Root of the sources is "/src"
- Modules are in /src/modules
- Everything is exported in /src/index.ts

Naming Conventions
- Use lowercase with dashes for directories (e.g., components/auth-wizard).

TypeScript Usage
- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Use strict mode in TypeScript for better type safety.

Tests
- Write tests using Vitest.
- Always name test files in the same way as the source file, but with ".spec.ts" suffix.
- Avoid writing mocks, prefer to use real implementations.

Utilities
- When writing utility function always name file and function in the same way, so it is easy to find it.
- Utility functions should be modular and not too complex.
- When writing utility functions, always write tests for them BEFORE writing the code.
- Iterate your implementation and tests until you are sure that the function works as expected.
- When writing utility functions, always write documentation for them.

Modules
- Each module name should be short, but descriptive. Such as "math", "eventbus", "github"
- Modules are bigger than utility functions and their goal is to abstract away complexity.
- Each module should have dedicated directory.
- Modules usually don't have application specific logic, they are more general and could be copied to other projects.
- Modules can depend on other modules, but should not depend on application specific logic.
- Prefer to write code as modules instead of application specific code.
- When using a module is a good idea:
  - When you need to integrate with external services
  - When you need to abstract away complexity of some library
  - When you want to implement some group of functions that are related to each other, like math, date, etc.

Libraries
- Always use Zod for validation of inputs.
- Always use axios for HTTP requests.

Yarn:
- Always use YARN for dependencies.
- Always use yarn test for running tests.