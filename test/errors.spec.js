"use strict";

const { AuthError,
        AuthNotAuthenticated,
        AuthUnvalidToken,
        AuthNotAuthorizedByToken,
        AuthUserNotCreated,
        AuthUserNotFound,
        AuthUserVerification,
        AuthUserAuthentication,
        AuthGroupsDbUpdate,
        AuthGroupNotFound,
        AuthNoGroupsFound
      } = require("../lib/util/errors");

describe("Test Errors", () => {
   
    it("it should create error without parameters", () => {
        expect(new AuthError("message") instanceof AuthError).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthNotAuthenticated("message") instanceof AuthNotAuthenticated).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthUnvalidToken("message") instanceof AuthUnvalidToken).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthNotAuthorizedByToken("message") instanceof AuthNotAuthorizedByToken).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthUserNotCreated("message") instanceof AuthUserNotCreated).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthUserNotFound("message") instanceof AuthUserNotFound).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthUserVerification("message") instanceof AuthUserVerification).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthUserAuthentication("message") instanceof AuthUserAuthentication).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthGroupsDbUpdate("message") instanceof AuthGroupsDbUpdate).toBe(true);
    });
    
    it("it should create error without parameters", () => {
        expect(new AuthGroupNotFound("message") instanceof AuthGroupNotFound).toBe(true);
    });

    it("it should create error without parameters", () => {
        expect(new AuthNoGroupsFound("message") instanceof AuthNoGroupsFound).toBe(true);
    });

});