"use strict";

const { ServiceBroker } = require("moleculer");
const dbMixin = require("../lib/db.mongo");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer, mongoUri;
beforeAll( async () => {
    mongoServer = new MongoMemoryServer();
    mongoUri = await mongoServer.getConnectionString();
});

afterAll( async () => {
    await mongoServer.stop();
});

const Test = {
    name: "test.db",
    mixins: [dbMixin],
    settings: { 
        uri: mongoUri 
    }, 
    actions: {
        insert(ctx) {
            return this.database.collection.insertOne(ctx.params)
            .then(res => {
                return res;
            });    
        },
        get(ctx) {
            return this.database.collection.findOne({ _id: ctx.params._id }).then(res => {
                return res;
            });
        }
    }
};

describe("Test db.mongo", () => {

    let broker, service;
    let doc = { doc: "sample" };
    beforeAll(async () => {
        broker = new ServiceBroker({
            logger: console,
            logLevel: "info"
        });
        service = broker.createService(Test);
        return broker.start();
    });

    afterAll(async (done) => {
        await broker.stop().then(() => done());
    });
    
    it("service should be created", () => {
        expect(service).toBeDefined();
    });

    it("sample doc should be added", async () => {
        expect.assertions(3);
        let res = await broker.call("test.db.insert",doc);
        expect(res).toBeDefined();
        expect(res.ops[0]).toEqual(expect.objectContaining(doc));
        expect(res.ops[0]._id).toBeDefined();
        doc = res.ops[0];
    });
    
    it("sample doc should be get again", async () => {
        expect.assertions(2);
        let res = await broker.call("test.db.get",{ _id: doc._id });
        expect(res).toBeDefined();
        expect(res).toEqual(expect.objectContaining(doc));
    });
    
});
