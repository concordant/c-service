import {IDBObject} from "../../Interfaces/Types";

export default interface IRegister<T> extends IDBObject<T> {
    current(): T;

    update(value: T): IRegister<T>;

    save(): Promise<IRegister<T>>;

}
