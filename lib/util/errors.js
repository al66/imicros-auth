/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

class AuthError extends Error {
    constructor(e) {
        super(e);
        Error.captureStackTrace(this, this.constructor);
        this.message = e.message || e;
        this.name = this.constructor.name;
    }
}

class AuthNotAuthenticated extends AuthError {}

class AuthUnvalidToken extends AuthError {
    constructor(e, { token } = {}) {
        super(e);
        this.token = token;
    }
}

class AuthNotAuthorizedByToken extends AuthError {
    constructor(e, { token, id, iss } = {}) {
        super(e);
        this.token = token;
        this.id = id;
        this.idd = iss;
    }
}

class AuthUserNotCreated extends AuthError {
    constructor(e, { email, err } = {}) {
        super(e);
        this.email = email;
        this.err = err;
    }
}

class AuthUserVerification extends AuthError {
    constructor(e, { email, id, token, err } = {}) {
        super(e);
        this.email = email;
        this.id = id;
        this.token = token;
        this.err = err;
    }
}

class AuthUserAuthentication extends AuthError {
    constructor(e, { email, id, token, err } = {}) {
        super(e);
        this.email = email;
        this.id = id;
        this.token = token;
        this.err = err;
    }
}

class AuthUserNotFound extends AuthError {
    constructor(e, { email, id, err } = {}) {
        super(e);
        this.email = email;
        this.id = id;
        this.err = err;
    }
}

module.exports = {
    AuthError,
    AuthNotAuthenticated,
    AuthUnvalidToken,
    AuthNotAuthorizedByToken,
    AuthUserNotCreated,
    AuthUserNotFound,
    AuthUserVerification,
    AuthUserAuthentication
};