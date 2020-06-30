/**
 * MIT License
 * 
 * Copyright (c) 2020, Concordant and contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * A pointer to a database object.
 * @Comment Firebase uses paths, e.g. "/users/userId", this might be
 * better if we want to allow direct access to sub collections,
 * e.g. "/users/userId/friends" --- I do not address object querying in this document
 * We also must consider GraphQL interface, that is what FaunaDB is doing.
 * I've walked a few steps on that direction myself. I think its doable... but something for after the MVP
 */
import {Document} from "../DataTypes/Interfaces/Types";
import Sync = PouchDB.Replication.Sync;

export type DataSource = IDataSource;
export type Connection = IBasicConnection | ITxConnection;
export type Database = IDB;
export type DBTxHandler = IDBTxHandlers;
export type DBSaveAllHandler = IDBSaveAllHandlers;
export type DatabaseEventEmitter = IDatabaseEventEmitter;
export type DatabaseHooks = IDatabaseHooks<any>;
export type DatabaseParams = IDatabaseParams;
// export type InternalObject<T> = IInternalObject<T>;

export type Key = string | { key: string, bucket: string };

/**
 * Places a transaction or an object version in position of the database timeline
 * Used to compare object versions
 * If underlying store does not allow the comparison of object version, the result of compareTo
 * is NON_COMPARABLE
 */
export interface IContext {
    /** Compares two contexts */
    compareVersion(other: IContext): CONTEXT_COMPARE;
}

// export interface IInternalObject<T> {
//     conflicts?: string[];
// }

export interface IConnectionParams {
    autoSave?: boolean;
    handleConflicts?: boolean;
    hook?: DatabaseHooks;
    putRetriesBeforeError?: number;
    putRetryMaxTimeout?: number;
}

export interface IDatabaseParams {
    syncHandlers?: Array<Sync<any> | undefined>;
    hooks?: DatabaseHooks;
}

export interface IDatabaseHooks<T> {
    conflictHandler: (current: Document<T>, objs: Array<Document<T>>) => T;
}

/** The comparison result of two contexts */
export enum CONTEXT_COMPARE {
    EQUAL = "EQUAL",
    LESS_THAN = "LESS_THAN",
    GREATER_THAN = "GREATER_THAN",
    CONCURRENT = "CONCURRENT",
    NON_COMPARABLE = "NON_COMPARABLE",
}

/**
 *  A representation of a database object that the user can interact with
 */
export interface IDBObject<T> extends IContext {
    id: string;

    /**
     * Commit the current modifications on the object
     */
    save(): Promise<IDBObject<T>>;

    /**
     * Checks if the object has local uncommitted changes
     */
    isDirty(): boolean;

    /**
     * Retrieves the current value of the object
     */
    current(): T;
}

/**
 * Database connection factory
 */
export interface IDataSource {

    /**
     *  Starts a new non-transactional session with the database
     *  Read operations always retrieve the most recent version of an object
     */
    connection(params: IConnectionParams): Promise<Connection>;

    /**
     * Starts a new transactional session with the database
     * Read operations retrieve object versions based on a snapshot.
     * @return a ITxConnection
     */
    txConnection(): Promise<ITxConnection>; // €
}

// TODO: Interface must extend event emitter.
// TODO: BasicConnection emits events on auto save; TxConnection emits events on transaction accept and commit
interface IDB {

    /**
     * Register a handler that allows to intersect certain calls in the system
     * Currently it provides a ConflictHandler, which allows the programmer to
     * manage multiple conflicting versions of the same object
     */
    registerHooks(hooks: DatabaseHooks): void;

    /**
     * Get an object from the database
     * Object is cached in the local store until release is called
     *
     * @param key - identifier of the object
     * @param defaultObjFunc - Reject promise if default object is not provided and object does not exist
     * @param  passThrough - ignore the cached value and fetch a fresh version
     * @return current object associated with the key, empty object if it doesn't exist yet.
     * Reject promise if impossible to get object or object is not of the given type.
     */

    get<T>(key: Key, defaultObjFunc?: () => T, passThrough?: boolean): Promise<Document<T>>;

    // query TODO: Need to think more about this before making decisions. Dont forget GraphQL!

    /**
     * Delete the value associated with a key
     * Implementation might not actually delete the key, dependending on the store
     * In that case it must use some tombstone to distinguish empty value from deleted
     *
     * @param key - identifier of the object
     */
    delete(key: Key): Promise<void>;

    /**
     * Subscribes events for a given key with a given filter
     *
     * @param keyOrKeys - identifier of a single object, or an array of identifiers
     * @param filter - predicate to decide if the event should be triggered
     * @param handlers - handlers for each event type
     * @returns EventEmitter for this subscription
     */
    subscribe<T>(keyOrKeys: Key | Key[], handlers: IDBHandlers<Document<T>>, filter?: IFilter): DatabaseEventEmitter;

    /**
     * Stop listening to events of provided EventEmitter
     * @param eventEmitter the event emitter to to be stopped
     */
    cancel(eventEmitter: DatabaseEventEmitter): void;

    /**
     * Release object from local store
     *
     * @param key - identifier of the object
     * @throws error if object cannot be released
     */
    release(key: Key): void | Error;

    releaseAll(): void | Error;

    /**
     * Close database
     */
    close(): Promise<void>;
}

export interface IOfflineSupport extends IDB {
    /**
     * Disconnects from the remote database
     * User can still read and modify objects that were cached locally
     *
     * @param waitFlush - try and wait for flushing outstanding changes
     * Reject promise if impossible to connect or operations were rejected
     */
    goOffline(waitFlush?: boolean): Promise<void>;

    /**
     * Tries to reestablish a connection with the remote database
     *
     * @param waitFlush - waits for changes flush to server
     * Reject promise if impossible to connect or operations were rejected
     */
    goOnline(waitFlush?: boolean): Promise<void>;

    isOnline(): boolean;
}

/**
 * A Connection establishes a channel to query the database
 * Different types of connections can have different types of guarantees
 * @comment Channels might be a more appropriate name
 */
export interface IBasicConnection extends IOfflineSupport {
    /**
     * Calls save for every object in cache that has outstanding operations
     */
    saveAll(): IDBSaveAllHandlers;

    /**
     * Discard local updates for object with given key
     * @param key - identifier of the object
     */
    discard(key: Key): void;

    /**
     * Discard local updates for all objects in cache
     */
    discardAll(): void;

    /**
     * All objects automatically call save when their state changes
     */
    setAutoSave(): void;

}

/**
 * Establishes a transactional session with the database.
 * Aims to provide a general interface that programmers can use to delimit transactions
 */
interface ITxConnection extends IOfflineSupport {

    /**
     * Begins a new transactions.
     * @throws Error if a transaction is undergoing
     */
    begin(): void | Error;

    commit(): IDBTxHandlers;
}

// TODO: Need to decide required events.
export interface IDBHandlers<T> {
    change?: ChangeHandler<T>;
}

export interface IDBSaveAllHandlers {
    complete?: SavedHandler<any>;
}

export interface IDBTxHandlers {
    commit?: RemoteCommitHandler;
    accepted?: RemoteCommitHandler;
}

/**
 * An event subscription filter. Can be used to receive events only for certain predicate updates
 */
export interface IFilter {
    attributes: any;
    // TODO: This is a placeholder definition. Needs to be designed with query model in mind
}

type ChangeHandler<T> = (key: string, value: T) => void;

type SavedHandler<T> = (key: string, value?: T) => void;

type RemoteCommitHandler = () => void;

export type EventType = "UPDATE";

interface IDatabaseEventEmitter extends EventEmitter {
    cancel(): void;
}
