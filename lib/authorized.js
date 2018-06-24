/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const { AuthNotAuthenticated, AuthNotAuthorized } = require("./util/errors");

module.exports = {
    name: "authorized",
    
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
    actions: {},

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {

        /**
         * Check authorization
         * 
         * @param {Object} meta data of call, owner id of ressource 
         *
         * @throws AuthNotAuthenticated, AuthNotAuthorized
         * @returns {Boolean} true
         */
        isAuthorized({meta, owner}) {
            if (!meta.user || !meta.user.id) {
                throw new AuthNotAuthenticated("not authenticated");
            }
            if (!meta.access || ( meta.access.indexOf(owner) < 0 )) {
                throw new AuthNotAuthorized("not authorized for group", { userId: meta.user.id, groupId: owner });
            }
            return true;
        }
    },

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