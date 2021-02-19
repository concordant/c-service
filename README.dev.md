## Private releases

The C-Service, and the C-CRDTlib it depends on,
are delivered as NPM packages.
Public releases are published on [npmjs](https://www.npmjs.com/),
while development releases are published
to a private [Gitlab Packages registry](https://gitlab.inria.fr/concordant/software/c-crdtlib/-/packages).

To use development releases, set up NPM
as described in the [c-crdtlib guide](https://gitlab.inria.fr/concordant/software/c-crdtlib/-/blob/master/README.dev.md#javascripttypescript-and-npm)

Go to project root directory and run:

```bash
npm install
```

## Build

The build is managed by NPM.
Typescript sources (code and tests) are transpiled to JavaScript.
NPM targets (set up as scripts in `package.json`) are as follows:

- `install`: install dependencies and prepare (compile)
- `run prepare`: lifecycle script (→ build)
- `run build`: should be removed (merge with prepare)
- `test`: run jest (tests & coverage);
  `DBNAME` must be set, and will be used as database name for tests.
- `start`: dev server, listens on TCP port 4000
- `run lint`: run eslint

## Used software

### Dev tools

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

### Libraries

- OpenAPI (aka Swagger): language for RESTful interface description
- Sofa: generate a REST interface from graphQL
- Apollo: graphQL library
- Express: web server
- Nano: couchDB client library
- C-CRDTlib: our CRDT library

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

- `swagger.yml` OpenAPI Specification, auto-generated from GraphQL
- `src/` Code
  - `service.ts` GraphQL schema definition & resolvers
- `test/` Tests (Jest)

### Artifacts (untracked)

- `node_modules/` Dependencies,
  created & populated by `npm install`
- `dist/` JS files,
  created & populated by `npm prepare` (tsc)
- `coverage/` Tests coverage,
  created & populated by `npm test` (jest)
