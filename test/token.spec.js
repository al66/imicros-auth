"use strict";

const { ServiceBroker } = require("moleculer");
const { Token } = require("../index");
const jwt = require("jsonwebtoken");
const { AuthNotAuthenticated, AuthUnvalidToken, AuthNotAuthorizedByToken } = require("../lib//util/errors");

describe("Test user service", () => {

    let broker, service;
    beforeAll(() => {
        broker = new ServiceBroker({
            logger: console
        });
        service = broker.createService(Token, Object.assign({ settings: {  } }));
        return broker.start();
    });

    afterAll((done) => {
        broker.stop().then(() => done());
    });
    
    describe("Test create service", () => {

        it("it should be created", () => {
            expect(service).toBeDefined();
        });

    });
    
    describe("Test sign and verify", () => {

        let opts, payload, token;
        beforeEach(() => {
            opts = { };
            payload = { data: "any kind of data" };
        });
        
        it("it should return signed token", () => {
            opts = { meta: { user: { id: "0815" } } };
            let params = {
                payload: payload,
                audience: "123456789"
            };
            return broker.call("token.sign", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.token).toBeDefined();
                token = res.token;
                let decoded = jwt.decode(res.token);
                expect(decoded).toEqual(expect.objectContaining({ data: "any kind of data", iss: "0815", aud: "123456789" }));
            });
        });

        it("it should return signed token w/o audience", () => {
            opts = { meta: { user: { id: "0815" } } };
            let params = {
                payload: payload
            };
            return broker.call("token.sign", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.token).toBeDefined();
                let decoded = jwt.decode(res.token);
                expect(decoded).toEqual(expect.objectContaining({ data: "any kind of data", iss: "0815" }));
            });
        });

        it("it should throw error not authenticated", async () => {
            opts = { meta: { user: {} } };
            let params = {
                payload: payload,
                audience: "123456789"
            };
            await broker.call("token.sign", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
            });
        });
        
        it("it should return decoded token", () => {
            opts = { meta: { user: { id: "0815" } } };
            let params = {
                token: token
            };
            return broker.call("token.verify", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ data: "any kind of data", iss: "0815", aud: "123456789" }));
            });
        });

        it("it should return decoded token", () => {
            opts = { meta: { user: { id: "4711" }, access: ["123456789"] } };
            let params = {
                token: token
            };
            return broker.call("token.verify", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ data: "any kind of data", iss: "0815", aud: "123456789" }));
            });
        });

        it("it should throw error not authenticated", async () => {
            opts = { meta: { } };
            let params = {
                token: token
            };
            await broker.call("token.verify", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
            });
        });

        it("it should throw error not authenticated", async () => {
            opts = { meta: { user: {} } };
            let params = {
                token: token
            };
            await broker.call("token.verify", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
            });
        });

        it("it should return error not authorized", async () => {
            opts = { meta: { user: { id: "4711" }, access: ["55555"] } };
            let params = {
                token: token
            };
            await broker.call("token.verify", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthorizedByToken).toBe(true);
            });
        });

        it("it should return error unvalid token", async () => {
            opts = { meta: { user: { id: "4711" }, access: ["123456789"] } };
            let params = {
                token: "a55666ffcd.xyz.6656af45"
            };
            await broker.call("token.verify", params, opts).catch(err => {
                expect(err instanceof AuthUnvalidToken).toBe(true);
                expect(err.token).toEqual("a55666ffcd.xyz.6656af45");
            });
        });
        
    });
 
});