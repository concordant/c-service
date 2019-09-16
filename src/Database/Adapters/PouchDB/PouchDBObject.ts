import PouchDB from "pouchdb";
import {CONTEXT_COMPARE, IContext, IDBObject, Key} from "../../Interfaces/Types";
import Document = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;

export class PouchDBObject<T> implements IDBObject<T> {
    public key: Key;
    private revision?: string;
    private document: Document<T> & ExistingDocument<T>;

    constructor(document: Document<T> & ExistingDocument<T>) {
        this.key = document._id;
        this.revision = document._rev || undefined;
        this.document = document;
    }

    /**
     * Commit the current modifications on the object
     */
    public save() {
        return Promise.reject("Not implemented");
    }

    /**
     * Checks if the object has local uncommitted changes
     */
    public isDirty() {
        return false;
    }

    public value() {
        return this.document;
    }

    // TODO: Needs to be tested. Don't know the exact semantic of the revision.
    public compareVersion(other: IContext) {
        if (!(other instanceof PouchDBObject)) {
            return CONTEXT_COMPARE.NON_COMPARABLE;
        } else if ((this.revision === undefined || this.revision === null) &&
            (other.revision !== undefined && other.revision !== null)) {
            return CONTEXT_COMPARE.LESS_THAN;
        } else if ((this.revision !== undefined && this.revision !== null) &&
            (other.revision === undefined || other.revision === null)) {
            return CONTEXT_COMPARE.GREATER_THAN;
        } else if ((this.revision === undefined || this.revision === null) &&
            (other.revision === undefined || other.revision === null)) {
            if (this.document === undefined && other.document !== undefined) {
                return CONTEXT_COMPARE.LESS_THAN;
            }
            if (this.document !== undefined && other.document === undefined) {
                return CONTEXT_COMPARE.GREATER_THAN;
            }
            if (this.document !== undefined && other.document !== undefined) {
                if (this.document === other.document) {
                    return CONTEXT_COMPARE.EQUAL;
                }
                return CONTEXT_COMPARE.CONCURRENT;
            }
        } else {
            if (this.revision && other.revision) {
                const res = this!.revision.localeCompare(other.revision);
                if (res < 0) {
                    return CONTEXT_COMPARE.LESS_THAN;
                }
                if (res > 0) {
                    return CONTEXT_COMPARE.GREATER_THAN;
                }
                return CONTEXT_COMPARE.EQUAL;
            }
            // else {
            //     if (this.revision) {
            //         return CONTEXT_COMPARE.GREATER_THAN;
            //     }
            //     return CONTEXT_COMPARE.LESS_THAN;
            // }
        }
        throw Error("Non-Expected case");

    }
}
