"use strict";

const { ServiceBroker } = require("moleculer");
const { Users } = require("../index");
// const { AuthUserNotCreated, AuthNotAuthenticated, AuthUserNotFound, AuthUserAuthentication } = require("../index").Errors;
const { AuthUserAuthentication } = require("../index").Errors;

let timestamp = Date.now();

// group access for imicros-flow
process.env.FLOW_GROUP_ID = "used group for handling events in imicros-flow";
process.env.SERVICE_TOKEN = "used to identify this service at imicros-acl for group access";
process.env.GRANT_ACCESS_TOKEN = "used to request group access for group <FLOW_GROUP_ID> at imicros-acl";

// mock external service calls 
let calls = {};
const Eventhandler = {
    name: "Eventhandler",
    events: {
        "users.verification.requested": {
            handler(ctx) {
                /*
                console.log("Payload:", ctx.params);
                console.log("Sender:", ctx.nodeID);
                console.log("Metadata:", ctx.meta);
                console.log("The called event name:", ctx.eventName);
                */
                calls.data = ctx.params;
                calls.meta = ctx.meta;
            }
        },
        "users.password.reset.requested": {
            handler(ctx) {
                calls.data = ctx.params;
                calls.meta = ctx.meta;
            }
        }
    }
};

// mock acl service
let accessToken = "grant access for group <FLOW_GROUP_ID> for this service";
const ACL = {
    name: "acl",
    actions: {
        "requestAccess": {
            params: {
                forGroupId: { type: "string" }
            },
            async handler(ctx) {
                if (ctx.meta.grantAccessToken === process.env.GRANT_ACCESS_TOKEN && 
                    ctx.meta.serviceToken === process.env.SERVICE_TOKEN) return { token: accessToken };
                return null;
            }
        },
        "users.password.reset.requested": {
            handler(ctx) {
                calls.data = ctx.params;
                calls.meta = ctx.meta;
            }
        }
    }
};



describe("Test user service", () => {

    let broker, service, initialUser, handlerService, aclService;
    
    beforeAll(() => {});

    afterAll(() => {});
    
    describe("Test create service", () => {

    
        it("it should be created", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "info" //"debug"
            });
            handlerService = broker.createService(Eventhandler);
            aclService = broker.createService(ACL);
            initialUser = `admin-${timestamp}@imicros.de`;
            service = broker.createService(Users, Object.assign({ 
                settings: { 
                    db: "imicros", 
                    uri: process.env.MONGODB_URI,
                    verifiedUsers: [initialUser],
                    emitEvents: true,
                    services: {
                        acl: "acl"
                    }
                } 
            }));
            await broker.start();
            expect(handlerService).toBeDefined();
            expect(aclService).toBeDefined();
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
                // wait for event
                setTimeout(function () {
                    if (!calls.data) {
                        console.log("event not received");
                    }
                }, 1000);
                expect(calls.data).toBeDefined();
                expect(calls.data.token).toBeDefined();
                expect(calls.data.locale).toBeDefined();
                expect(calls.data.email).toEqual(email);
                expect(calls.meta.accessToken).toEqual(accessToken);
                token = calls.data.token;
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
                // wait for event
                setTimeout(function () {
                    if (!calls.data) {
                        console.log("event not received");
                    }
                }, 1000);
                expect(calls.data).toBeDefined();
                expect(calls.data.token).toBeDefined();
                expect(calls.meta.accessToken).toEqual(accessToken);
                token = calls.data.token;
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

    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });    
    
});