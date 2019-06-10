"use strict";

const { ServiceBroker } = require("moleculer");
const { Users } = require("../index");
const { AuthUserNotCreated, AuthNotAuthenticated, AuthUserNotFound, AuthUserAuthentication } = require("../index").Errors;

// mock external service calls 
let calls = {};
const Flow = {
    name: "my.flow",
    actions: {
        emit: {
            handler(ctx) {
                calls.data = ctx.params;
            }
        }
    }
};

describe("Test user service", () => {

    let broker, service;
    beforeAll( async () => {
        broker = new ServiceBroker({
            logger: console
        });
        broker.createService(Flow);
        service = broker.createService(Users, Object.assign({ 
            settings: { 
                db: "imicros", 
                uri: process.env.MONGODB_URI,
                requestVerificationMail: {
                    call: "my.flow.emit",
                    params: {
                        topic: "users",
                        event: "requestVerificationMail",
                        payload: "params"
                    }
                },
                requestPasswordReset: {
                    call: "my.flow.emit",
                    params: {
                        topic: "users",
                        event: "requestPasswordReset",
                        payload: "params"
                    }
                }
            } 
        }));
        return broker.start();
    });

    afterAll(async (done) => {
        await broker.stop().then(() => done());
    });
    
    describe("Test create service", () => {

        it("it should be created", () => {
            expect(service).toBeDefined();
            expect(service.database.db).toBeDefined();
            expect(service.database.collection).toBeDefined();
        });

    });
    
    describe("Test create entry", () => {

        let opts, id;
        let email = "test-"+ Date.now() + "@host.com";
        let token;
        
        beforeEach(() => {
            opts = { };
        });
        
        it("it should return created entry with id", () => {
            let params = {
                email: email,
                password: "my secret"
            };
            return broker.call("users.create", params, opts).then(res => {
                id = res.id;
                expect(res.id).toBeDefined();
                expect(res.password).not.toBeDefined();
                expect(res).toEqual(expect.objectContaining({ email: params.email, locale: "en" }));
            });
        });

        it("it should return with error", async () => {
            let params = {
                email: email,
                password: "my secret"
            };
            expect.assertions(3);
            await broker.call("users.create", params, opts).catch(err => {
                expect(err instanceof AuthUserNotCreated).toBe(true);
                expect(err.message).toEqual("user already exist!");
                expect(err.email).toEqual(email);
            });
        });

        it("it should return error not authenticated", async () => {
            opts = { };
            let params = {
            };
            expect.assertions(2);
            await broker.call("users.me", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });
        
        it("it should return error user not found", async () => {
            opts = { meta: { user: { id: "5af99fa9233ac418e41a1a1b" } } };
            let params = {
            };
            expect.assertions(3);
            await broker.call("users.me", params, opts).catch(err => {
                expect(err instanceof AuthUserNotFound).toBe(true);
                expect(err.message).toEqual("user not found");
                expect(err.id).toEqual(opts.meta.user.id);
            });
        });

        it("it should return new user", () => {
            opts = { meta: { user: { id: id } } };
            let params = {
            };
            return broker.call("users.me", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ email: email, verified: false }));
            });
        });
        
        it("it should send confirmation mail", () => {
            opts = { meta: { user: { id: id } } };
            calls = {};
            let params = {
            };
            return broker.call("users.requestConfirmationMail", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ sent: email }));
                expect(calls.data).toBeDefined();
                expect(calls.data.payload.token).toBeDefined();
                token = calls.data.payload.token;
            });
        });
        
        it("it should confirm user", () => {
            opts = {};
            let params = {
                token: token
            };
            return broker.call("users.confirm", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ verified: email }));
            });
        });
        
        it("it should return confirmed user", () => {
            opts = { meta: { user: { id: id } } };
            let params = {
            };
            return broker.call("users.me", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ email: email, verified: true }));
            });
        });
        
        it("it should login new user", () => {
            let params = {
                email: email,
                password: "my secret"
            };
            return broker.call("users.login", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.token).toBeDefined();
                token = res.token;
                expect(res.user).toEqual(expect.objectContaining({ email: email }));
            });
        });
        
        it("it should throw error wrong password", async () => {
            let params = {
                email: email,
                password: "my wrong secret"
            };
            expect.assertions(3);
            await broker.call("users.login", params, opts).catch(err => {
                expect(err instanceof AuthUserAuthentication).toBe(true);
                expect(err.message).toEqual("wrong password");
                expect(err.email).toEqual(email);
            });
        });
        
        it("it should resolve access token", () => {
            let params = {
                token: token
            };
            return broker.call("users.resolveToken", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.user).toEqual(expect.objectContaining({ email: email }));
            });
        });

        it("it should send reset password mail", () => {
            opts = {};
            calls = {};
            let params = {
                email: email
            };
            return broker.call("users.requestPasswordResetMail", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ sent: email }));
                expect(calls.data).toBeDefined();
                expect(calls.data.payload.token).toBeDefined();
                token = calls.data.payload.token;
            });
        });
        
        it("it should reset password", () => {
            opts = {};
            let params = {
                token: token,
                password: "my changed secret"
            };
            return broker.call("users.resetPassword", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ reset: id }));
            });
        });
        
        it("it should throw error AuthUserAuthentication", async () => {
            opts = {};
            let params = {
                token: "wrong token",
                password: "my changed secret"
            };
            expect.assertions(3);
            await broker.call("users.resetPassword", params, opts).catch(err => {
                expect(err instanceof AuthUserAuthentication).toBe(true);
                expect(err.message).toEqual("token not valid");
                expect(err.token).toEqual("wrong token");
            });
        });
        
        
    });
    
});