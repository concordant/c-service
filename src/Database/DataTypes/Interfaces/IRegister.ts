import {IDBObject} from "../../Interfaces/Types";

export default interface IRegister<T> extends IDBObject {
    get(): T;

    set(value: T): void;

}
