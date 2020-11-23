# Contributing

Dev contributing guide.

## General instructions

Please read the [Concordant general contributing instructions](https://gitlab.inria.fr/concordant/internal/documentation/-/blob/master/CONTRIBUTING.md)

## Branches

Contributions are organised in a dev phases release cycle.

The `master` branch is the latest stable release, tagged with release number.

Wanted features, bug fixes, ideas are stagged as Issues, and developed as sprints.

The `dev` branch is always open (so, never closed) for current development, all accepted merge requests are merged in this dev branch.

At release time, the `dev` branch is simply merged into master, which means new deployement, and assigned a release version number depending on the features and cycle weight.

## Version tags

Each merge to master is a new prod deployement that needs to be tagged as a new version.

We use a `x.y.z` release number model, where:

- x: refers to major update;
- y: new features update;
- z: bug fix, minor change update.
