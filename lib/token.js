/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const jwt 			= require("jsonwebtoken");
const { AuthError, AuthNotAuthenticated, AuthUnvalidToken, AuthNotAuthorizedByToken } = require("./util/errors");

/** Actions */
// action sign { payload } => { token }
// action verify { token } => { decoded }

/** Secret for JWT */
const JWT_SECRET = process.env.JWT_SECRET || "jwt-imicros-token-secret";

module.exports = {
    name: "token",
    
	/**
	 * Service settings
	 */
    settings: {},

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
		 * Sign token
		 * 
		 * @actions
		 * @param {Object} payload
		 * 
		 * @returns {String} Signed token
		 */
        sign: {
            params: {
                payload: { type: "object" },
                audience: { type: "string", optional: true }
            },			
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id) {
                    throw new AuthNotAuthenticated("not authenticated");
                }
                let payload = ctx.params.payload;
                let options = { issuer: ctx.meta.user.id };
                if (ctx.params.audience) options.audience = ctx.params.audience;
                return { token: jwt.sign(payload, JWT_SECRET,options), payload: payload };
            }
        },

		/**
		 * Verify token
		 * 
		 * @actions
         * @param {String} token
		 * 
		 * @returns {Object} Decoded payload 
		 */
        verify: {
            params: {
                token: "string"
            },
            handler(ctx) {
                if (!ctx.meta.user || !ctx.meta.user.id) {
                    throw new AuthNotAuthenticated("not authenticated");
                }
                return new Promise((resolve, reject) => {
                    jwt.verify(ctx.params.token, JWT_SECRET, (err, decoded) => {
                        if (err)
                            return reject(err);

                        resolve(decoded);
                    });
                })
                .then(decoded => {
                    if (ctx.meta.user.id == decoded.iss) return decoded;
                    if (ctx.meta.access && Array.isArray(ctx.meta.access) && ctx.meta.access.indexOf(decoded.aud) >= 0) return decoded;
                    throw new AuthNotAuthorizedByToken("not authorized by token", { token: ctx.params.token, aud: decoded.iss, access: ctx.meta.access});
                })
                .catch(err => {
                    if (err instanceof AuthError) throw err;
                    throw new AuthUnvalidToken("unvalid token", { token: ctx.params.token });
                });
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