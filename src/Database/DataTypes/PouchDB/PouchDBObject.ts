import PouchDB from "pouchdb";
import {PouchDBAdapter} from "../../Adapters/PouchDB/PouchDBAdapter";
import {CONTEXT_COMPARE, IContext} from "../../Interfaces/Types";
import PouchDocument = PouchDB.Core.Document;
import ExistingDocument = PouchDB.Core.ExistingDocument;
import {Document} from "../Interfaces/Types";

export class PouchDBObject<T> implements Document<T> {
    private newDocument?: PouchDocument<T> & ExistingDocument<T>;

    constructor(
        private document: PouchDocument<T> & ExistingDocument<T>,
        private connection: PouchDBAdapter) {
    }

    /**
     * Commit the current modifications on the object
     */
    public save(): Promise<PouchDBObject<T>> {
        return this.connection.save(this);
    }

    /**
     * Checks if the object has local uncommitted changes
     */
    public isDirty() {
        return this.newDocument !== undefined && this.newDocument !== null;
    }

    public originalValue(): T {
        return this.document;
    }

    public currentValue(): T {
        return this.newDocument ? this.newDocument : this.document;
    }

    public updateValue(value: T): void {
        this.newDocument = {_id: this.document._id, _rev: this.document._rev, ...value};
        if (this.connection.autoSave) {
            this.save().then((obj) => {
                // TODO: make event handling for connection. send auto save event;
            });
        }
    }

    // TODO: Needs to be tested. Don't know the exact semantic of the revision. Make sure it covers all cases
    public compareVersion(other: IContext) {
        if (!(other instanceof PouchDBObject)) {
            return CONTEXT_COMPARE.NON_COMPARABLE;
        }
        const revision = this.document._rev;
        const otherRevision = other.document._rev;

        if ((revision === undefined || revision === null) &&
            (otherRevision !== undefined && otherRevision !== null)) {
            return CONTEXT_COMPARE.LESS_THAN;
        } else if ((revision !== undefined && revision !== null) &&
            (otherRevision === undefined || otherRevision === null)) {
            return CONTEXT_COMPARE.GREATER_THAN;
        } else if ((revision === undefined || revision === null) &&
            (otherRevision === undefined || otherRevision === null)) {
            return CONTEXT_COMPARE.CONCURRENT;
        } else {
            const res = revision.localeCompare(otherRevision);
            if (res < 0) {
                return CONTEXT_COMPARE.LESS_THAN;
            }
            if (res > 0) {
                return CONTEXT_COMPARE.GREATER_THAN;
            }
            return CONTEXT_COMPARE.EQUAL;
        }
    }
}
