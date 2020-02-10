/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const mongodb 		= require("mongodb");
const MongoClient   = mongodb.MongoClient;
const ObjectID      = mongodb.ObjectID;

module.exports = {
    name: "db.mongo",
        
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
         * Connect to database
         */
        connect() {
            
            if (!this.database) {
                this.database = {};
                this.database.databaseName = this.settings.db || this.name.replace(".","_");
                this.database.uri = this.settings.uri || "mongodb://localhost:27017";
            }
            let opts = { useUnifiedTopology: true };
            
            return MongoClient.connect(this.database.uri, opts).then(client => {
                this.database.client = client;
                this.database.db = client.db ? client.db(this.database.databaseName) : client;
                this.database.collectionName = this.settings.collection || this.name;
                this.database.collection = this.database.db.collection(this.database.collectionName);
                this.logger.info(`Connected to ${this.database.uri} database ${this.database.databaseName} collection ${this.database.collectionName}`);
                
                /* istanbul ignore next */
                this.database.db.on("disconnected", function mongoDisconnected() {
                    this.logger.warn("Disconnected from MongoDB.");
                }.bind(this));

            });
        },

        /**
         * Disconnect from database
         */
        disconnect() {
            if (!this.database.client) return Promise.resolve();
            return this.database.client.close()
            .then(() => {
                this.logger.info(`Disconnected from ${this.database.uri}`);
                return Promise.resolve();
            });
        },
        
        /**
         * Convert hex string to ObjectID
         *
         */
        stringToObjectID(id) {
            if (typeof id == "string")
                return new ObjectID.createFromHexString(id);
            return id;
        },

        /**
         * Convert ObjectID to Hex string
         *
         */
        objectIDToString(id) {
            return id.toHexString();
        },

    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        
    },

    /**
     * Service started lifecycle event handler
     */
    started() {

        // Connect to database
        return new Promise(resolve => {
            let connecting = () => {
                this.connect()
                    .then(() => {
                        this.logger.debug(`Connected to database ${this.database.uri}`);
                        return resolve();
                    })
                    .catch(err => {
                        setTimeout(() => {
                            this.logger.error("Connection error!", err);
                            this.logger.warn("Reconnecting...");
                            connecting();
                        }, 1000);
                    });
            };

            connecting();
        });
        
    },

    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {

        // Disconnect from database
        await this.disconnect();
        this.logger.debug(`Disconnected from database ${this.database.uri}`);
        
    }
    
};