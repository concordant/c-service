# C-Service

[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.inria.fr/concordant/software/c-service/badges/master/pipeline.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)
[![coverage report](https://gitlab.inria.fr/concordant/software/c-service/badges/master/coverage.svg)](https://gitlab.inria.fr/concordant/software/c-service/-/commits/master)

The first version of C-Service API.

## Getting started

### Requirements

For the next steps, you will need the following software:

- Make sure you have the latest stable version of Node.js: [see official installation guide](https://nodejs.org/en/download/);
- The project uses Git to download some required dependencies: [follow the official install guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- C-Service runs on top of CouchDB, [see CouchDB's installation guide](https://docs.couchdb.org/en/stable/install/index.html)

In addition, you will need to enable CORS in CouchDB by using command line

```shell
npx add-cors-to-couchdb
```

or using the [CouchDB user panel](http://127.0.0.1:5984/_utils/).

### Install Project dependencies

Installation requieres a [GitLab token](https://docs.gitlab.com/ee/user/project/deploy_tokens/) to download the private C-CRDTLib npm package.

Go to project root directory and:

```bash
npm install
```

### Start C-Service

First, one need to compile build the project:

```bash
npm run build
```

Set credentials and run service:

```bash
export COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
npm run start
```

**Note:** Need to start a CouchDB server beforehand. Can customize the database URL with the environment variable COUCHDB_URL.
You might need to change the binding address in the CouchDB admin panel to allow peers to connect to the database.

You can also run tests using:

```bash
export DBNAME=my-dbname COUCHDB_USER=my-user COUCHDB_PASSWORD=my-passwd
npm run test
```

### Test C-Service using curl

Once your C-Service is running you can query its REST API through using curl.
You can view your changes in the [CouchDB user pannel](http://127.0.0.1:5984/_utils/).

Create the _myapp_ database:

```bash
curl --request POST --header "Content-Type: application/json" --data '{"appName":"myapp"}' http://127.0.0.1:4000/api/create-app
```

Insert/update a PNCounter named _myobject_ in _myapp_ database:

```bash
curl --request POST --header "Content-Type: application/json" --data '{"appName":"myapp","id":"{\"name\":\"myobject\",\"type\":\"PNCounter\"}","document":"{\"type\":\"PNCounter\",\"metadata\":{\"increment\":[{\"name\":\"clientid\"},{\"first\":60,\"second\":{\"uid\":{\"name\":\"clientid\"},\"cnt\":-21474836}}],\"decrement\":[]},\"value\":60}"}' http://127.0.0.1:4000/api/update-object
```

Get the PNCounter named _myobject_ in _myapp_ database:

```bash
curl --request POST --header "Content-Type: application/json" --data '{"appName":"myapp","id":"{\"name\":\"myobject\",\"type\":\"PNCounter\"}"}' http://127.0.0.1:4000/api/get-object
```

Get all objects of _myapp_ database:

```bash
curl --request POST --header "Content-Type: application/json" --data '{"appName":"myapp"}' http://127.0.0.1:4000/api/get-objects
```

Delete _myapp_ database:

```bash
curl --request POST --header "Content-Type: application/json" --data '{"appName":"myapp"}' http://127.0.0.1:4000/api/delete-app
```

## Requirements

Node: v10.15+
NPM: v6.13+

(Project might work with older Node and NPM versions)
