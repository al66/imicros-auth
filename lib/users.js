/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const dbMixin       = require("./db.mongo");
const bcrypt 		= require("bcrypt");
const jwt 			= require("jsonwebtoken");
const { AuthError, 
        AuthUserNotCreated, 
        AuthNotAuthenticated, 
        AuthUserNotFound, 
        AuthUserVerification,
        AuthUserAuthentication
      } = require("./util/errors");
const mapper = require("./util/mapper");

/** Actions */
// action create { email, password } => { user }
// action requestConfirmationMail { email } => { result }
// action confirm { token } => { result }
// action requestPasswordResetMail { email } => { result }
// action resetPassword { token, password } => { result }
// action login { email, password } => { user, token }
// action resolveToken { token } => { user }
// action me { } => { user }
//TODO: ? action list { }
//TODO: ? action get { token } => { user }
//TODO: ? action delete { email, password }


/** Secret for JWT */
const JWT_SECRET = process.env.JWT_USERS_SECRET || "jwt-imicros-users-secret";

module.exports = {
    name: "users",
    mixins: [dbMixin],

    /**
     * Service settings
     */
    settings: {
        
        /** Database */
        db: "imicros",
        collection: "users",

        /** API */
        /*
        links: {
            confirmation: "http://www.imicros.de/confirm",
            resetPassword: "http://www.imicros.de/reset"
        }
        */
        
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
         * Register a new user
         * 
         * @actions
         * @param {Email} email
         * @param {String} password 
         * 
         * @returns {Object} Created user with id
         */
        create: {
            params: {
                email: { type: "email" },
                password: { type: "string", min: 8 },
                locale: { type: "string", min: 2, max:2, pattern: /^[a-zA-Z]+$/, optional: true }
            },			
            handler(ctx) {
                let user = {
                    email: ctx.params.email
                };
                return this.database.collection.findOne({ email: ctx.params.email })
                    .then(found => {
                        if (found)  throw new AuthUserNotCreated("user already exist!", { email: ctx.params.email });
                    })
                    .then(() => {
                        user = {
                            email: ctx.params.email,
                            locale: ctx.params.locale ? ctx.params.locale.toLowerCase() : "en"
                        };
                        user.password = bcrypt.hashSync(ctx.params.password, 10);
                        user.verified = false;
                        user.createdAt = new Date();
                        return this.database.collection.insertOne(user).then(res => {
                            if (res.insertedCount > 0)  {
                                return this.transformDocument(res.ops[0]);
                            }
                            throw new AuthUserNotCreated("db insert failed", { email: ctx.params.email } );
                        })
                        .catch(err => {
                            throw new AuthUserNotCreated("db insert failed", { email: ctx.params.email, err: err} );
                        });
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthUserNotCreated("user not created", { email: ctx.params.email, err: err} );
                    });
            }
        },

        /**
         * Request confirmation mail
         * 
         * @actions
         * 
         * @returns {Object} result with property {String} sent: email 
         */
        requestConfirmationMail: {
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                return this.database.collection.findOne({  _id: this.stringToObjectID(ctx.meta.user.id)  })
                    .then(async (user) => {
                        if (!user) throw new AuthUserNotFound("user not found", { id: ctx.meta.user.id });
                        if (user.verified) throw new AuthUserVerification("user already verified", { email: user.email });

                        let token = this.signedJWT({ type: "verify_token", email: user.email });
                        let data = {
                            email: user.email,
                            locale: user.locale,
                            token:  token
                        };
                        // create link
                        if (this.settings.links && this.settings.links.confirmation) {
                            data.link = this.settings.links.confirmation + "?token=" + token;
                        }
                        await this.callAction("requestVerificationMail", data);
                        return { sent: user.email };
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthUserVerification("request confirmation mail failed", { id: ctx.meta.user.id, err: err} );
                    });
            }
        },

        /**
         * Confirm registration with token
         * 
         * @actions
         * @param {String} token - confirmation token
         * 
         * @returns {Object} Logged in user with token
         */
        confirm: {
            params: {
                token: { type: "string", min: 1 }
            },
            handler(ctx) {
                let token = ctx.params.token;
                return new this.Promise((resolve, reject) => {
                    jwt.verify(token, JWT_SECRET, (err, decoded) => {
                        if (err) 
                            return reject(new AuthUserVerification("token not valid", { token: token} ));
                        resolve(decoded);
                    });
                })
                .then(decoded => {
                    if (decoded.type == "verify_token" && decoded.email)
                        return this.database.collection.updateOne({ email: decoded.email }, { $set: { verified: true } }).then(res => {
                            if (res.modifiedCount > 0 || res.matchedCount > 0 ) return { verified: decoded.email };
                            throw new AuthUserNotFound("user not found", { email: decoded.email });
                        })
                        .catch(err => {
                            throw new AuthUserNotFound("user not found", { email: decoded.email, err: err });
                        });
                    throw new AuthUserVerification("token not valid", { token: token} );
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    throw new AuthUserVerification("confirmation failed", { token: token, err: err} );
                });
            }
        },        
        
        /**
         * Login with username & password
         * 
         * @actions
         * @param {Email} email
         * @param {String} password 
         * 
         * @returns {Object} With properties {Object} user and {String} token
         */
        login: {
            params: {
                email: { type: "email" },
                password: { type: "string", min: 1 }
            },
            handler(ctx) {
                return this.database.collection.findOne({ email: ctx.params.email })
                    .then(user => {
                        if (!user) throw new AuthUserNotFound("user not found", { email: ctx.params.email });

                        return bcrypt.compare(ctx.params.password, user.password).then(res => {
                            if (!res) throw new AuthUserAuthentication("wrong password", { email: ctx.params.email });

                            return user;
                        });
                    })
                    .then(user => {
                        // Transform user entity (remove password and all protected fields)
                        let response = {
                            token: this.signedJWT({ type: "access_token", id: this.objectIDToString(user._id) }),
                            user: this.transformDocument(user)
                        };
                        return response;
                    })
                    .catch(err => {
                        if (err instanceof AuthError) throw err;
                        throw new AuthUserAuthentication("authentication failed", { email: ctx.params.email, err: err} );
                    });
            }
        },

        /**
         * Get user by JWT token (for API gateway authentication)
         * 
         * @actions
         * @param {String} token - JWT token
         * 
         * @returns {Object} With property {Object} user as resolved user
         */
        resolveToken: {
            params: {
                token: "string"
            },
            handler(ctx) {
                return new Promise((resolve, reject) => {
                    jwt.verify(ctx.params.token, JWT_SECRET, (err, decoded) => {
                        if (err)
                            return reject(new AuthUserAuthentication("token not valid", { token: ctx.params.token} ));

                        resolve(decoded);
                    });
                })
                .then(decoded => {
                    if (decoded.type == "access_token" && decoded.id) {
                        return this.database.collection.findOne({ _id: this.stringToObjectID(decoded.id) })
                            .then(user => {
                                if (!user) throw new AuthUserNotFound("user not found", { id: decoded.id });

                                return { user: this.transformDocument(user) };
                            })
                            .catch(err => {
                                throw new AuthUserNotFound("user not found", { id: decoded.id, err: err });
                            });
                    }
                    throw new AuthUserAuthentication("token not valid", { token: ctx.params.token} );
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    /* istanbul ignore next */  // Just to wrap any other possible error
                    throw new AuthUserAuthentication("token not valid", { token: ctx.params.token, err: err} );
                });
            }
        },
        
        /**
         * Get current user entity.
         * 
         * @actions
         * 
         * @returns {Object} user
         */
        me: {
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id) {
                    throw new AuthNotAuthenticated("not authenticated" );
                }
                return this.database.collection.findOne({ _id: this.stringToObjectID(ctx.meta.user.id) }).then(user => {
                    if (!user) throw new AuthUserNotFound("user not found", { id: ctx.meta.user.id });

                    return this.transformDocument(user);
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    throw new AuthUserNotFound("user not found", { id: ctx.meta.user.id, err: err} );
                });
            }
        },

        /**
         * Request password reset mail
         * 
         * @actions
         * @param {Email} email
         * 
         * @returns {Object} result with property {String} sent: email 
         */
        requestPasswordResetMail: {
            params: {
                email: { type: "email" }
            },
            handler(ctx) {
                return this.Promise.resolve()
                .then(() => this.database.collection.findOne({  email: ctx.params.email  }))
                .then(async (user) => {
                    if (!user) throw new AuthUserNotFound("user not found", { email: ctx.params.email });

                    let token = this.signedJWT({ type: "reset_token", id: this.objectIDToString(user._id) });
                    let data = {
                        email: user.email,
                        locale: user.locale,
                        token:  token
                    };
                    // create link
                    if (this.settings.links && this.settings.links.resetPassword) {
                        data.link = this.settings.links.resetPassword + "?token=" + token;
                    }
                    await this.callAction("requestPasswordReset", data);
                    return { sent: user.email };
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    throw new AuthUserNotFound("user not found", { id: ctx.meta.user.id, err: err} );
                });
            }
        },

        /**
         * Reset password with token
         * 
         * @actions
         * @param {String} token - reset password token
         * @param {String} password
         * 
         * @returns {Object}  With properties {Object} user and {String} token
         */
        resetPassword: {
            params: {
                token: { type: "string", min: 1 },
                password: { type: "string", min: 8 }
            },
            handler(ctx) {
                let token = ctx.params.token;
                return new this.Promise((resolve, reject) => {
                    jwt.verify(token, JWT_SECRET, (err, decoded) => {
                        if (err)
                            return reject(new AuthUserAuthentication("token not valid", { token: ctx.params.token} ));
                        resolve(decoded);
                    });
                })
                .then(decoded => {
                    if (decoded.type == "reset_token" && decoded.id) {
                        let password = bcrypt.hashSync(ctx.params.password, 10);
                        return this.database.collection.updateOne({ _id: this.stringToObjectID(decoded.id) }, { $set: { password: password } })
                        .then(res => {
                            if (res.modifiedCount > 0 || res.matchedCount > 0 ) {
                                return { reset: decoded.id };                    
                            }
                            throw new AuthUserNotFound("user not found", { id: decoded.id });
                        })
                        .catch(err => {
                            throw new AuthUserNotFound("user not found", { id: decoded.id, err: err });
                        });
                    }
                    throw new AuthUserAuthentication("token not valid", { token: ctx.params.token} );
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    /* istanbul ignore next */  // Just to wrap any other possible error
                    throw new AuthUserAuthentication("token not valid", { token: ctx.params.token, err: err} );
                });
            }
        },        
        
        
    },
    
    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {

        /**
         * Transform database document
         * 
         * @param {Object} entity 
         * 
         * @returns {Object} Transformed entity
         */
        transformDocument (entity) {
            // normalize id
            entity.id = this.objectIDToString(entity._id);
            // hide internal fields
            delete entity.password;
            delete entity._id;
            return entity;
        },

        /**
         * Generate a signed JWT token
         * 
         * @param {Object} payload 
         * 
         * @returns {String} Signed token
         */
        signedJWT(payload) {
            let today = new Date();
            let exp = new Date(today);
            exp.setDate(today.getDate() + 60);
            payload.exp = Math.floor(exp.getTime() / 1000);

            return jwt.sign(payload, JWT_SECRET);
        },
        
        /**
         * call external service
         * 
         * @param {String} action 
         * @param {Object} params 
         * 
         * @returns {Object} result of call
         */
        callAction(action, params) {
            let p;
            try {
                p =  mapper(this.calls[action].params, { params: params });
            } catch (err) {
                this.logger.debug("Error mapping parameters", { params: this.calls[action].params, error: err });
            }
            return this.broker.call(this.calls[action].call, p);
        }
        
    },

    /**
     * Service created lifecycle event handler
     */
    created() {

        // Defaults for external calls
        this.calls = {};
        this.calls["requestVerificationMail"] = {
            call: "flow.publisher.emit",
            params: {
                topic: "users",
                event: "requestVerificationMail",
                payload: "params"
            }
        };
        
        this.calls["requestPasswordReset"] = {
            call: "flow.publisher.emit",
            params: {
                topic: "users",
                event: "requestPasswordReset",
                payload: "params"
            }
        };

        // Override defaults with settings
        let self = this;
        Object.keys(this.calls).forEach(function(key /*,index*/) {
            if (self.settings[key] && self.settings[key].call) {
                self.calls[key].call = self.settings[key].call;
            }
            if (self.settings[key] && self.settings[key].params) {
                self.calls[key].params = self.settings[key].params;
            }
        });
        
    },

    /**
     * Service started lifecycle event handler
     */
    started() {},

    /**
     * Service stopped lifecycle event handler
     */
    stopped() {}
    
};