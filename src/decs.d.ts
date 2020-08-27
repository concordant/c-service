// Here are all declarations for external JS files missing typings.
// This prevents errors without needing to use @ts-ignore annotations.
// These declarations should be updated when a package is no longer needed
// or a typing package is made available.

declare module "pouchdb-adapter-asyncstorage";
declare module "delta-crdts" {
  export = CRDT;
}
declare module "delta-crdts-msgpack-codec";
