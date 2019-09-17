// @ts-ignore
import AsyncStorage from "pouchdb-adapter-asyncstorage";
import PouchDB from "pouchdb-react-native";

PouchDB.plugin(AsyncStorage);

export {PouchDB};
