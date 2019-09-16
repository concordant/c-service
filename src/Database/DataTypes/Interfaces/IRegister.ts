import {IDBObject} from "../../Interfaces/Types";

export default interface IRegister<T> extends IDBObject<T> {
    currentValue(): T;

    updateValue(value: T): void;

}
