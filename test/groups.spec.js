"use strict";

const { ServiceBroker } = require("moleculer");
const { Groups } = require("../index");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { AuthNotAuthenticated,
        AuthNoGroupsFound,
        AuthGroupNotFound,
       AuthGroupsDbUpdate   
      } = require("../index").Errors;

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const timestamp = Date.now();

let mongoServer, mongoUri;
beforeAll( async () => {
    mongoServer = new MongoMemoryServer();
    mongoUri = await mongoServer.getConnectionString();
});

afterAll( async () => {
    await mongoServer.stop();
});

describe("Test group service", () => {

    let broker, service;
    beforeAll( async () => {
        broker = new ServiceBroker({
            logger: console
        });
        service = broker.createService(Groups, Object.assign({ 
            settings: { 
                db: "imicros", 
                uri: mongoUri 
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
        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}` , email: `1-${timestamp}@host.com` } } };
        });
        
        it("it should return created entry with id", () => {
            let params = {
                name: "group to be created"
            };
            return broker.call("groups.add", params, opts).then(res => {
                id = res.id;
                expect(res.id).toBeDefined();
                expect(res).toEqual(expect.objectContaining(params));
            });
        });

        it("it should return members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toEqual([{ id: `1-${timestamp}`, email: `1-${timestamp}@host.com`, role: "admin" }]);
            });
        });
        
        it("it should return new group", () => {
            let params = {
                id: id
            };
            return broker.call("groups.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ name: "group to be created", 
                    members: [{ id: `1-${timestamp}`, 
                        email: `1-${timestamp}@host.com`, 
                        role: "admin" }] 
                }));
            });
        });
        
        it("it should update name", () => {
            let params = {
                id: id,
                name: "group renamed"
            };
            return broker.call("groups.rename", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.updated).toEqual(id);
            });
        });

        it("it should return new name", () => {
            let params = {
                id: id
            };
            return broker.call("groups.get", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(expect.objectContaining({ name: "group renamed", 
                    members: [{ id: `1-${timestamp}`, 
                        email: `1-${timestamp}@host.com`, 
                        role: "admin" }] 
                }));
            });
        });

        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                name: "group to be created"
            };
            expect.assertions(2);
            await broker.call("groups.add", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        

        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id
            };
            expect.assertions(2);
            await broker.call("groups.get", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id,
                name: "group renamed"
            };
            expect.assertions(2);
            await broker.call("groups.rename", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        it("it should throw error AuthGroupNotFound", async () => {
            let params = {
                id: id.replace(/...$/,"999")
            };
            expect.assertions(3);
            await broker.call("groups.get", params, opts).catch(err => {
                expect(err instanceof AuthGroupNotFound).toBe(true);
                expect(err.message).toEqual("group id not found");
                expect(err.id).toEqual(id.replace(/...$/,"999"));
            });
        });        

        it("it should throw error AuthGroupNotFound", async () => {
            let params = {
                id: id.replace(/...$/,"999"),
                name: "group renamed"
            };
            expect.assertions(3);
            await broker.call("groups.rename", params, opts).catch(err => {
                expect(err instanceof AuthGroupNotFound).toBe(true);
                expect(err.message).toEqual("group id not found");
                expect(err.id).toEqual(id.replace(/...$/,"999"));
            });
        });        

    });
    
    describe("Test join group", () => {

        let opts, id;
        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}`, email: `1-${timestamp}@host.com` } } };
        });

        it("it should return id for created entry", () => {
            let params = {
                name: "group to be joined"
            };
            return broker.call("groups.add", params, opts).then(res => {
                id = res.id;
                expect(res.id).toBeDefined();
                expect(res).toEqual(expect.objectContaining(params));
            });
        });

        it("it should return return error for call members", async () => {
            let opts = { meta: { user: { id: `2-${timestamp}`, email: `2-${timestamp}@host.com` } } };
            let params = {
                id: id
            };
            expect.assertions(3);
            await broker.call("groups.members", params, opts).catch(err => {
                expect(err instanceof AuthGroupNotFound).toBe(true);
                expect(err.message).toEqual("group id not found");
                expect(err.id).toEqual(id);
            });
        });

        it("it should create another group", () => {
            let opts = { meta: { user: { id: `2-${timestamp}`, email: `2-${timestamp}@host.com` } } };
            let params = {
                name: "group other user"
            };
            return broker.call("groups.add", params, opts).then(res => {
                expect(res.id).toBeDefined();
                expect(res).toEqual(expect.objectContaining(params));
            });
        });
        
        it("it should invite user", () => {
            let params = {
                id: id, 
                email: `3-${timestamp}@host.com`
            };
            return broker.call("groups.invite", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.invited).toBeDefined();
                expect(res.invited).toEqual(`3-${timestamp}@host.com`);
            });
        });

        it("it should return invited member", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ email: `3-${timestamp}@host.com` }));
            });
        });
        
        
        it("it should throw AuthGroupsDbUpdate - invite same user again", async () => {
            let params = {
                id: id, 
                email: `3-${timestamp}@host.com`
            };
            expect.assertions(3);
            await broker.call("groups.invite", params, opts).catch(err => {
                expect(err instanceof AuthGroupsDbUpdate).toBe(true);
                expect(err.message).toEqual("group id not found or already invited");
                expect(err.id).toEqual(id);
            });
        });
        
        it("it should add user as member", () => {
            let opts = { meta: { user: { id: `3-${timestamp}`, email: `3-${timestamp}@host.com` } } };
            let params = {
                id: id
            };
            return broker.call("groups.join", params, opts).then(res => {
                expect(res.updated).toBeDefined();
                expect(res.updated).toEqual(id);
            });
        });

        it("it should return all members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ id: `3-${timestamp}`, email: `3-${timestamp}@host.com` }));
            });
        });
        
        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id
            };
            expect.assertions(2);
            await broker.call("groups.members", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id, 
                email: `3-${timestamp}@host.com`
            };
            expect.assertions(2);
            await broker.call("groups.invite", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id
            };
            expect.assertions(2);
            await broker.call("groups.join", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        it("it should throw error AuthGroupsDbUpdate", async () => {
            let params = {
                id: id.replace(/...$/,"999"), 
                email: `3-${timestamp}@host.com`
            };
            expect.assertions(3);
            await broker.call("groups.invite", params, opts).catch(err => {
                expect(err instanceof AuthGroupsDbUpdate).toBe(true);
                expect(err.message).toEqual("group id not found or already invited");
                expect(err.id).toEqual(id.replace(/...$/,"999"));
            });
        });

    });

    describe("Test list groups", () => {

        let opts;
        beforeEach(() => {

        });

        it("it should return groups with access by invited user", () => {
            opts = { meta: { user: { id: `3-${timestamp}`, email: `3-${timestamp}@host.com` } } };
            let params = {
                limit: 100
            };
            return broker.call("groups.list", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(Array.isArray(res)).toEqual(true);
                expect(res.length).toEqual(1);
                //res.forEach(element => console.log(element.members))
            });
        });

        it("it should return groups with access by admin", () => {
            opts = { meta: { user: { id: `1-${timestamp}`, email: `1-${timestamp}@host.com` } } };
            let params = {
                limit: 100
            };
            return broker.call("groups.list", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(Array.isArray(res)).toEqual(true);
                expect(res.length).toEqual(2);
                //res.forEach(element => console.log(element.members))
            });
        });

        it("it should throw error AuthNoGroupsFound", async () => {
            opts = { meta: { user: { id: "AnyId", email: "Any@host.com" } } };
            let params = {
                limit: 100
            };
            expect.assertions(4);
            await broker.call("groups.list", params, opts).catch(err => {
                expect(err instanceof AuthNoGroupsFound).toBe(true);
                expect(err.message).toEqual("no groups found");
                expect(err.memberId).toEqual("AnyId");
                expect(err.memberEmail).toEqual("Any@host.com");
            });
        });

    });
    
    describe("Test join group as admin", () => {

        let opts, id;
        beforeEach(() => {
            opts = { meta: { user: { id: `1-${timestamp}`, email: `1-${timestamp}@host.com` } } };
        });

        it("it should return id for created entry", () => {
            let params = {
                name: "group to be joined as admin"
            };
            return broker.call("groups.add", params, opts).then(res => {
                id = res.id;
                expect(res.id).toBeDefined();
                expect(res).toEqual(expect.objectContaining(params));
            });
        });

        it("it should invite user as admin", () => {
            let params = {
                id: id, 
                email: `4-${timestamp}@host.com`,
                role: "admin"
            };
            return broker.call("groups.invite", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.invited).toBeDefined();
                expect(res.invited).toEqual(`4-${timestamp}@host.com`);
            });
        });
        
        it("it should add user as admin", () => {
            opts = { meta: { user: { id: `4-${timestamp}`, email: `4-${timestamp}@host.com` } } };
            let params = {
                id: id
            };
            return broker.call("groups.join", params, opts).then(res => {
                expect(res.updated).toBeDefined();
                expect(res.updated).toEqual(id);
            });
        });

        it("it should return all members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ id: `4-${timestamp}`, email: `4-${timestamp}@host.com`, role: "admin" }));
            });
        });
        
        it("it should change user role to contact", () => {
            let params = {
                id: id, 
                email: `4-${timestamp}@host.com`,
                role: "contact"
            };
            return broker.call("groups.setRole", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.updated).toBeDefined();
                expect(res.updated).toEqual(id);
            });
        });
        
        it("it should return all members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ id: `4-${timestamp}`, email: `4-${timestamp}@host.com`, role: "contact" }));
            });
        });
        
        it("it should not change admins own role", async () => {
            let params = {
                id: id, 
                email: `1-${timestamp}@host.com`,
                role: "contact"
            };
            expect.assertions(3);
            await broker.call("groups.setRole", params, opts).catch(err => {
                expect(err instanceof AuthGroupsDbUpdate).toBe(true);
                expect(err.message).toEqual("member cannot change his own role");
                expect(err.id).toEqual(id);
            });
        });
        
        it("it should return unchanged member", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ id: `1-${timestamp}`, email: `1-${timestamp}@host.com`, role: "admin" }));
            });
        });

        it("it should leave group", () => {
            opts = { meta: { user: { id: `4-${timestamp}`, email: `4-${timestamp}@host.com` } } };
            let params = {
                id: id
            };
            return broker.call("groups.leave", params, opts).then(res => {
                expect(res.updated).toBeDefined();
                expect(res.updated).toEqual(id);
            });
        });

        it("it should return all members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ email: `4-${timestamp}@host.com`, role: "contact" }));
                expect(res.members).not.toContainEqual(expect.objectContaining({ id: `4-${timestamp}`, email: `4-${timestamp}@host.com`, role: "contact" }));
            });
        });
        
        it("it should remove member from group", () => {
            let params = {
                id: id,
                email: `4-${timestamp}@host.com`
            };
            return broker.call("groups.remove", params, opts).then(res => {
                expect(res.removed).toBeDefined();
                expect(res.removed).toEqual(params.email);
            });
        });

        it("it should return all members", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).not.toContainEqual(expect.objectContaining({ email: `4-${timestamp}@host.com` }));
            });
        });
        
        it("it should not remove admin itself from group", async () => {
            let params = {
                id: id,
                email: `1-${timestamp}@host.com`
            };
            expect.assertions(3);
            await broker.call("groups.remove", params, opts).catch(err => {
                expect(err instanceof AuthGroupsDbUpdate).toBe(true);
                expect(err.message).toEqual("group id not found or already removed");
                expect(err.id).toEqual(id);
            });
        });

        it("it should return still admin as member", () => {
            let params = {
                id: id
            };
            return broker.call("groups.members", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.members).toBeDefined();
                expect(res.members).toContainEqual(expect.objectContaining({ email: `1-${timestamp}@host.com` }));
            });
        });

        it("it should throw error AuthNotAuthenticated", async () => {
            opts = { meta: { user: { } } };
            let params = {
                id: id, 
                email: `4-${timestamp}@host.com`,
                role: "contact"
            };
            expect.assertions(2);
            await broker.call("groups.setRole", params, opts).catch(err => {
                expect(err instanceof AuthNotAuthenticated).toBe(true);
                expect(err.message).toEqual("not authenticated");
            });
        });        
        
        
        it("it should throw error AuthGroupNotFound", async () => {
            opts = { meta: { user: { id: `4-${timestamp}`, email: `4-${timestamp}@host.com` } } };
            let params = {
                id: id.replace(/...$/,"999")
            };
            expect.assertions(3);
            await broker.call("groups.leave", params, opts).catch(err => {
                expect(err instanceof AuthGroupNotFound).toBe(true);
                expect(err.message).toEqual("group id not found");
                expect(err.id).toEqual(id.replace(/...$/,"999"));
            });
        });        

    });
});