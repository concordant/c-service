## Build targets

(Set up as scripts in package.json)

- `prepare`: lifecycle script (→ build)
- `build`: should be removed (merge with prepare)
- `test`: run jest (tests & coverage)
- `start`: dev server, listens on TCP port 4000
- `lint`: run eslint

## Used software

### Dev tools:

- tsc: Typescript transpiler (to JavaScript)
- NPM: package/build manager
- babel-node: development nodeJS/Babel environment,
  _not meant for production use_
- Husky: git hooks manager
- lint-staged: apply pre-commit hooks to changed files only ; runs:
  - ESlint: linter (static code analyser)
  - Prettier: code formatter
- Jest: JS testing library tool
- Gitlab-CI: gitlab Continuous Integration platform

### Libraries:

- OpenAPI (aka Swagger): language for RESTful interface description
- Sofa: generate a REST interface from graphQL
- Apollo: graphQL library
- Express: web server
- Nano: couchDB client library

## Files

### Build, configuration, metadata

- `LICENSE`
- `README.md` Doc: user
- `README.dev.md` Doc: developer
- `.git/` Config: Git
- `.gitignore`
- `package.json` Config: NPM: metadata, dependencies, scripts,
  config (lint-staged, Husky)
- `package-lock.json` Actual dependency tree (automatically updated)
- `tsconfig.json` Config: tsc TypeScript compiler:  
   `src \ {node_modules, **/__tests__/*} → dist/`
- `.babelrc` Config: Babel compiler (??)
- `.eslintrc.js` Config: ESlint
- `.eslintignore`
- `.prettierignore` Config: Prettier
- `jest.config.js` Config: Jest (roots: src/ & test/ ; TS transformer)
- `.gitlab-ci.yml` Config: continuous integration
- `Dockerfile` Config: Docker build
- `.dockerignore`

### Code

- `swagger.yml` OpenAPI Specification
- `src/` Code
  - `server.ts` GraphQL schema definition & resolvers
  - `test/` Tests (Jest)

### Artifacts (untracked):

- `node_modules/` Dependencies,
  created & populated by `npm install`
- `dist/` JS files,
  created & populated by `npm prepare` (tsc)
- `coverage/` Tests coverage,
  created & populated by `npm test` (jest)
