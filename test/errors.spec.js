"use strict";

const { AuthError,
        AuthNotAuthenticated,
        AuthUnvalidToken,
        AuthNotAuthorizedByToken } = require("../lib/util/errors");

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
    
    
});