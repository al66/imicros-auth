"use strict";

const mapper = require("../lib/util/mapper");

class SomeError extends Error {}

describe("Test Mapper", () => {

    it("it should be a function", () => {
        expect(typeof mapper === "function").toBe(true);
    });
    
    it("it should map json input", () => {
        let result = mapper({ account: { id: "meta.user.id" } },{ meta: { user: { id: "123456" } } });
        expect(result).toBeDefined();
        expect(result).toEqual({ account: { id: "123456" } });
    });
    
    it("it should map deep structures", () => {
        let result = mapper({ member: { account: { id: "meta.user.id" } } },{ meta: { user: { id: "123456" } } });
        expect(result).toBeDefined();
        expect(result).toEqual({ member: { account: { id: "123456" } } });
    });
    
    it("it should map arrays structures", () => {
        let result = mapper([{ account: { id: "meta.user.id" }},{ account: { mail: "meta.user.mail" }}],{ meta: { user: { id: "123456", mail: "any@test.com" } } });
        expect(result).toBeDefined();
        expect(result).toEqual([{ account: { id: "123456" }},{ account: { mail: "any@test.com" }}]);
    });
    
    it("it should also work without any input", () => {
        let result = mapper({ account: { id: "meta.user.id" }, test: "Hallo" }  );
        expect(result).toBeDefined();
        expect(result).toEqual({ account: { id: "meta.user.id" }, test: "Hallo" });
    });
    
    it("it should also work without any output", () => {
        let result = mapper(null, { test: "Hallo" }  );
        expect(result).toEqual(null);
    });
    
    it("it should also work with output string (do nothing)", () => {
        let result = mapper("Some Text", { test: "Hallo" }  );
        expect(result).toEqual("Some Text");
    });
    
    it("it should also work with output number (do nothing)", () => {
        let result = mapper(5, { test: "Hallo" }  );
        expect(result).toEqual(5);
    });
    
    it("it should also work with standard objects w/o own properties", () => {
        let error = new SomeError("Any");
        error.substitute = "meta.user.id";
        let result = mapper(error, { meta: { user: { id: "123456" } } }  );
        expect(result instanceof SomeError).toEqual(true);
        expect(result.substitute).toEqual("123456");
    });
    
    it("it shouldn't replace other texts or numbers", () => {
        let result = mapper({ account: { id: "meta.user.id" }, test: "Hallo", age: 55 },{ meta: { user: { id: "123456" } } });
        expect(result).toBeDefined();
        expect(result).toEqual({ account: { id: "123456" }, test: "Hallo", age: 55 });
    });
    
});