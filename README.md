# C-Service

[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.inria.fr/concordant/software/c-service/badges/master/pipeline.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)
[![coverage report](https://gitlab.inria.fr/concordant/software/c-service/badges/master/coverage.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)

Service code for the C-Labbook demo.
The first version of C-Service API.

## Getting started

0.**Requirements**

For the next steps, you will need the following software:

- Make sure you have the latest version of Node.js: [see official installation guide](https://nodejs.org/en/download/);
- The project uses Git to download some required dependencies: [follow the official install guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- C-Service runs on top of CouchDB, [see CouchDB's installation guide](https://docs.couchdb.org/en/stable/install/index.html)

In addition, you will need to enable CORS in CouchDB

```shell
npx add-cors-to-couchdb
```

1.**Install Project dependencies**

Installation requires a [GitLab token](https://docs.gitlab.com/ee/user/project/deploy_tokens/) to download the private C-CRDTLib npm package.

Before running the installer, please make sure that you have configured npm with the required private URL and `gitlab-token` as described in the [c-crdtlib usage guide](https://gitlab.inria.fr/concordant/software/c-crdtlib#usage).

Go to project root directory and:

```bash
npm install
```

2.**Start C-Service**

First, one need to compile build the project:

```bash
npm run build
```

Set database name and credentials and run service:

```bash
export COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
npm start
```

**Note:** Need to start a CouchDB server beforehand. Can customise the database URL with the environment variable COUCHDB_URL.
You might need to change the binding address in the CouchDB admin panel to allow peers to connect to the database.

You can also run tests using:

```bash
export DBNAME=my-dbname COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
npm test
```

## Requirements

Node: v10.15+
NPM: v6.13+

(Project might work with older Node and NPM versions)
