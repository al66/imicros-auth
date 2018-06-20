/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const dbMixin       = require("./db.mongo");
const { AuthError, 
        AuthNotAuthenticated,
        AuthGroupsDbUpdate,
        AuthGroupNotFound,
        AuthNoGroupsFound
      } = require("./util/errors");

/** Actions */
// action add { name } => { group }
// action invite { id, email, role } => { result }
// action setRole { id, email, role } => { result }
// action remove { id, email } => { result }
// action join { id } => { result }
// action leave { id } => { result }
// action hide { id, hide } => { result }
// action alias { id, alias } => { result }
// action list { } => { groups }
// action get { id } => { group }
// action members { id } => { members }
// action rename { name } => { group }

//TODO: ?? action delete { id } => { result }
//TODO: action addAccess { id, group } => { result } only for admins
//TODO: action removeAccess { id, group } => { result } only for admins
//TODO: action access { } => { groups }

//TODO: get all groups the user has access to :
// db.getCollection('groups').find({ access: { $in: ["9875","9876549"]} })
// db.getCollection('groups').find({ members: { $in: [array of users groups]} }, { _id: 1 })

module.exports = {
    name: "groups",
    mixins: [dbMixin],
    
    /**
     * Service settings
     */
    settings: {
        db: "imicros",
        collection: "groups"
    },

    /**
     * Service metadata
     */
    metadata: {},

    /**
     * Service dependencies
     */
    //dependencies: [],	

    /**
     * Actions
     */
    actions: {

        /**
         * Create a new group
         * 
         * @actions
         * @param {String} name
         * 
         * @returns {Object} Created group with id
         */
        add: {
            params: {
                name: "string"
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let group = {
                    name: ctx.params.name,
                    members: [],
                };
                group.members.push({ id: ctx.meta.user.id, email: ctx.meta.user.email, role: "admin"});
                return this.database.collection.insertOne(group)
                    .then(res => {
                        if (res.insertedCount > 0)  {
                            res.ops[0].id = this.objectIDToString(res.ops[0]._id);
                            res.ops[0]._id = null;
                            return res.ops[0];
                        }
                        throw new AuthGroupsDbUpdate("db insert failed");
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupsDbUpdate("db insert failed", {err: err});
                    });
            }
        },
        
        /**
         * Get group by id
         * 
         * @actions
         * @param {String | Number} id
         * 
         * @returns {Object} group
         */
        get: {
            params: {
                id: [
                  { type: "string" },
                  { type: "number" }
                ]
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for members
                    $or: [ { "members.id": ctx.meta.user.id }, { "members.email": ctx.meta.user.email } ]
                };
                return this.database.collection.findOne(query)
                    .then(res => { 
                        if (!res) throw new AuthGroupNotFound("group id not found", {id: ctx.params.id});
                        return res; 
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", {id: ctx.params.id, err: err});
                    });
            }
        },
        
        /**
         * List all groups, where user is member
         * 
         * @actions
         * @param {Number} limit
         * @param {Number} offset
         * 
         * @returns {Object} array of groups
         */
        list: {
            params: {
                limit: { type: "number", optional: true },
                offset: { type: "number", optional: true }
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    // all with contacts
                    $or: [ { "members.id": ctx.meta.user.id }, { "members.email": ctx.meta.user.email } ]
                };
                let limit = ctx.params.limit || 10000000;
                let skip = ctx.params.offset || 0;
                return this.database.collection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray()
                    .then(res => { 
                        if (!res || res.length <= 0) throw new AuthNoGroupsFound("no groups found", { memberId: ctx.meta.user.id, memberEmail: ctx.meta.user.email });
                        return res; 
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthNoGroupsFound("no groups found", { memberId: ctx.meta.user.id, memberEmail: ctx.meta.user.email, err:err });
                    });
            }
        },
        
        /**
         * Rename group
         * 
         * @actions
         * @param {String | Number} id
         * @param {String} new name
         * 
         * @returns {Object} result
         */
        rename: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                name: { type: "string" }
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" }]
                };
                let update = {
                    $set: {
                        name: ctx.params.name
                    }
                };
                return this.database.collection.updateOne(query,update)
                    .then(res => {
                        if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                        if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Invite user to a group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String} email (invited user)
         * @param {String} role ( admin | member | contact )
         * 
         * @returns {Object} result
         */
        invite: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                email: "email",
                role: { type: "string" , enum: ["admin","member","contact"], optional: true}
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    "members.email": { $ne: ctx.params.email },
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" }]
                };
                let member = {
                    email: ctx.params.email,
                    role: ctx.params.role || "member"
                };
                let update = {
                    $push: { members: member }
                };
                return this.database.collection.updateOne(query,update)
                    .then(res => { 
                        if (res.modifiedCount > 0) return { invited: ctx.params.email, group: ctx.params.id, role: ctx.params.role };                    
                        throw new AuthGroupsDbUpdate("group id not found or already invited", { id: ctx.params.id } );
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },

        /**
         * Remove user or invitation from group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String} email (invited user)
         * 
         * @returns {Object} result
         */
        remove: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                email: "email"
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" } ]
                };
                return this.database.collection.findOne(query)
                    .then(res => {
                        if (!res._id) throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                        let query = {
                            _id: this.stringToObjectID(res._id),
                        };
                        let update = {
                            // admin may not remove his own role
                            $pull: { members: { email: ctx.params.email, id: { $ne:ctx.meta.user.id  } } }
                        };
                        return this.database.collection.updateOne(query,update)
                            .then(res => { 
                                if (res.modifiedCount > 0) return { removed: ctx.params.email, group: ctx.params.id };  
                                throw new AuthGroupsDbUpdate("group id not found or already removed", { id: ctx.params.id } );
                            });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },

        /**
         * Change role of group member
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String} email (invited user)
         * @param {String} role ( admin | member | contact )
         * 
         * @returns {Object} result
         */
        setRole: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                email: { type: "string" },
                role: { type: "string" , enum: ["admin","member","contact"] }
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                if (ctx.params.email == ctx.meta.user.email) {
                    throw new AuthGroupsDbUpdate("member cannot change his own role", { id: ctx.params.id } );
                } 
                let query = {
                    _id: this.stringToObjectID(ctx.params.id), 
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" }]
                };
                return this.database.collection.findOne(query)
                    .then(res => {
                        if (!res._id) throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                        let query = {
                            _id: this.stringToObjectID(res._id),
                            // admin may not change his own role
                            members: { $elemMatch: { id: { $ne: ctx.meta.user.id }, email: ctx.params.email }} 
                        };
                        let update = { 
                            $set: { "members.$.role": ctx.params.role }
                        };
                        return this.database.collection.updateOne(query, update)
                            .then(res => {
                                if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                                if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                                throw new AuthGroupsDbUpdate("member not found or nothing to change", { id: ctx.params.id });
                            });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Get list of group members
         * 
         * @actions
         * @param {String | Number} group id
         * 
         * @returns {Object} result
         */
        members: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for members
                    $or: [ { "members.id": ctx.meta.user.id }, { "members.email": ctx.meta.user.email } ]
                };
                return this.database.collection.findOne(query)
                    .then(res => { 
                        return { members: res.members }; 
                    })
                    .catch(err => {
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Accept invitation to a group
         * 
         * @actions
         * @param {String | Number} group id
         * 
         * @returns {Object} result
         */
        join: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id), 
                    "members.email": ctx.meta.user.email
                };
                let update = { 
                    $set: { "members.$.id": ctx.meta.user.id }
                };
                return this.database.collection.updateOne(query, update)
                    .then(res => {
                        if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                        if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Set hide flag for group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {Boolean} hide
         * 
         * @returns {Object} result
         */
        hide: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                hide: { type: "boolean", optional: true }
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id), 
                    "members.email": ctx.meta.user.email
                };
                let update = { 
                    $set: { "members.$.hide": ctx.params.hide ? ctx.params.hide : false }
                };
                return this.database.collection.updateOne(query, update)
                    .then(res => {
                        if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                        if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Set alias name for group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String} alias name
         * 
         * @returns {Object} result
         */
        alias: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                alias: { type: "string", optional: true }
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id), 
                    "members.email": ctx.meta.user.email
                };
                let update = {};
                if (ctx.params.alias) {
                    update = { 
                        $set: { "members.$.alias": ctx.params.alias }
                    };
                } else {
                    update = { 
                        $unset: { "members.$.alias": "" }
                    };
                }
                return this.database.collection.updateOne(query, update)
                    .then(res => {
                        if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                        if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Leave a group
         * 
         * @actions
         * @param {String | Number} group id
         * 
         * @returns {Object} result
         */
        leave: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id), 
                    "members.email": ctx.meta.user.email
                };
                let update = { 
                    $unset: { "members.$.id": "" }
                };
                return this.database.collection.updateOne(query, update)
                    .then(res => {
                        if (res.modifiedCount > 0) return { updated: ctx.params.id };                    
                        if (res.matchedCount > 0) return { "up-to-date": ctx.params.id };
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", {id: ctx.params.id, err: err});
                    });
            }
        },
        
        /**
         * Grant access fo another group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String | Number} group id access will be granted for
         * 
         * @returns {Object} result
         */
        addAccess: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                group: [
                    { type: "string" },
                    { type: "number" }
                ]
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" }]
                };
                let update = {
                    $push: { access: ctx.params.group }
                };
                return this.database.collection.updateOne(query,update)
                    .then(res => { 
                        if (res.modifiedCount > 0) return { added: ctx.params.group };                    
                        throw new AuthGroupsDbUpdate("group id not found", { id: ctx.params.id } );
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });
            }
        },
        
        /**
         * Remove access fo another group
         * 
         * @actions
         * @param {String | Number} group id
         * @param {String | Number} group id, who's access grant will be removed
         * 
         * @returns {Object} result
         */
        removeAccess: {
            params: {
                id: [
                    { type: "string" },
                    { type: "number" }
                ],
                group: [
                    { type: "string" },
                    { type: "number" }
                ]
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                let query = {
                    _id: this.stringToObjectID(ctx.params.id),
                    // only allowed for admins
                    $and: [ { "members.id": ctx.meta.user.id }, { "members.role": "admin" }]
                };
                let update = {
                    $pull: { access: ctx.params.group }
                };
                return this.database.collection.updateOne(query,update)
                    .then(res => { 
                        if (res.modifiedCount > 0) return { removed: ctx.params.group };                    
                        throw new AuthGroupsDbUpdate("group id not found or access already removed", { id: ctx.params.id } );
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthGroupNotFound("group id not found", { id: ctx.params.id, err: err });
                    });

            }
        },
        
        /**
         * List of groups the authenticated user has access to
         * 
         * @actions
         * 
         * @returns {Array} group id's
         */
        access: {
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id || !ctx.meta.user.email ) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
            }
        }
        
    },
    
    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {},

    /**
     * Service created lifecycle event handler
     */
    created() {},

    /**
     * Service started lifecycle event handler
     */
    started() {},

    /**
     * Service stopped lifecycle event handler
     */
    stopped() {}
    
};