"use strict";

const { ServiceBroker } = require("moleculer");
const { Authorized } = require("../index");
const { AuthNotAuthenticated, 
        AuthNotAuthorized
      } = require("../index").Errors;

const timestamp = Date.now();

const Service = {
    name: "store",
    mixins: [Authorized],
    actions: {
        add: {
            params: {
                owner: "string",
                key: "string",
                data: "string"
            },
            handler(ctx) {
                this.isAuthorized({ meta: ctx.meta, owner: ctx.params.owner });
                this.store[ctx.params.key] = ctx.params.data;
                return this.store[ctx.params.key];
            }
        },
        get: {
            params: {
                owner: "string",
                key: "string"
            },
            handler(ctx) {
                this.isAuthorized({ meta: ctx.meta, owner: ctx.params.owner });
                return this.store[ctx.params.key];
            }
        }
    },
    created () {
        this.store = [];
    }
};

describe("Test authorize mixin", () => {

    let broker, service;
    beforeAll( async () => {
        broker = new ServiceBroker({
            logger: console
        });
        service = broker.createService(Service);
        return broker.start();
    });

    afterAll(async (done) => {
        await broker.stop().then(() => done());
    });
    
    describe("Test create service", () => {

        it("it should be created", () => {
            expect(service).toBeDefined();
        });

    });
    
    describe("Test isAuthorized", () => {
        
        let opts;
        
        it("it should return added ressource", () => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                owner: `1-${timestamp}`,
                key: `key1-${timestamp}`,
                data: "first test"
            };
            return broker.call("store.add", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(params.data);
            });
        });

        it("it should throw error AuthNotAuthorized", async () => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                owner: `3-${timestamp}`,
                key: `key1-${timestamp}`,
                data: "first test"
            };
            expect.assertions(4);
            await broker.call("store.add", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthorized).toBe(true);
                expect(err.message).toEqual("not authorized for group");
                expect(err.userId).toEqual(`1-${timestamp}`);
                expect(err.groupId).toEqual(`3-${timestamp}`);
            });
        });        

        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { email: `1-${timestamp}@host.com` }, access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                owner: `3-${timestamp}`,
                key: `key1-${timestamp}`,
                data: "first test"
            };
            expect.assertions(2);
            await broker.call("store.add", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
    
        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { access: [`1-${timestamp}`, `2-${timestamp}`] } };
            let params = {
                owner: `3-${timestamp}`,
                key: `key1-${timestamp}`,
                data: "first test"
            };
            expect.assertions(2);
            await broker.call("store.add", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
    
    });
});    