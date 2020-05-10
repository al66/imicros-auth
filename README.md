# imicros-auth
[![Build Status](https://travis-ci.org/al66/imicros-auth.svg?branch=master)](https://travis-ci.org/al66/imicros-auth)
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-auth/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-auth?branch=master)

[Moleculer](https://github.com/moleculerjs/moleculer) services for Authentication

## Installation
```
$ npm install imicros-auth --save
```
## Dependencies
Requires a running Mongo Instance.

Requires a running service which can be called to handle
 - requestVerificationMail
 - requestPasswordReset

# Usage
## Usage Users
```js
const { ServiceBroker } = require("moleculer");
const { Users } = require("imicros-auth");

broker = new ServiceBroker({
    logger: console
});
service = broker.createService(Users, Object.assign({ 
    settings: { 
        uri: mongoUri,
        requestVerificationMail: {
            call: "flow.publisher.emit",
            params: {
                topic: "users",
                event: "requestVerificationMail",
                payload: "params"
            }
        },
        requestPasswordReset: {
            call: "flow.publisher.emit",
            params: {
                topic: "users",
                event: "requestPasswordReset",
                payload: "params"
            }
        }
    } 
}));
broker.start();

```
### Actions
action create { email, password, locale } => { user }  
action requestConfirmationMail { email } => { sent }  
action confirm { token } => { verified }  
action requestPasswordResetMail { email } => { sent }  
action resetPassword { token, password } => { result }  
action login { email, password } => { user, token }  
action resolveToken { token } => { user }  
action me { } => { user }
#### Create
For REST call via API. Or as a direct call:
```js
let param = {
    email: "example@test.com",  // valid email
    password: "my secret",      // min 8
    locale: "en"                // optional - 2 character
}
broker.call("users.create", param).then(user => {
    // user.id is filled
})
```
#### requestConfirmationMail
For REST call via API. 
Or as a direct call:
```js
let param = {
    email: "example@test.com"   // registered email (user created)
}
broker.call("users.requestConfirmationMail", param).then(user => {
    // calls the method under settings with default parameters:
    //   {
    //      email: user.email,
    //      locale: user.locale,
    //      token:  token
    //   }
    // the token should be added to a link in the confirmation mail
    // in case of a successful call it returns
    //  {
    //      sent: "example@test.com"
    //  }
})
```
#### confirm
This method must be called by the method which handles the confirmation link in the confirmation mail.
```js
let param = {
    token: token  // valid token (received as return value from requestConfirmationMail)
}
broker.call("users.confirm", param).then(user => {
    // in case of a successful call it returns
    //  {
    //      verified: "example@test.com"
    //  }
})
```
#### requestPasswordResetMail
For REST call via API. 
Or as a direct call:
```js
let param = {
    email: "example@test.com"   // registered email (user created)
}
broker.call("users.requestPasswordResetMail", param).then(user => {
    // calls the method under settings with default parameters:
    //   {
    //      email: user.email,
    //      locale: user.locale,
    //      token:  token
    //   }
    // in case of a successful call it returns
    //  {
    //      sent: "example@test.com"
    //  }
})
```
#### resetPassword
For REST call via API. 
Or as a direct call:
```js
let param = {
    token: token,               // valid token (received as return value from requestPasswordResetMail)
    password: "my new secret",  // new password, min 8
}
broker.call("users.resetPassword", param).then(user => {
    // in case of a successful call it returns
    //  {
    //      reset: user.id
    //  }
})
```
#### login
For REST call via API. 
Or as a direct call:
```js
let param = {
    email: "example@test.com",  // registered email (user created)
    password: "my secret"       // min 8
}
broker.call("users.login", param).then(user => {
    // in case of a successful call it returns
    //  {
    //      token: generated token
    //      user: user object
    //  }
})
```
#### resolveToken
This method is for calling in moleculer-web method authorize.  
If further imicros services like imicros-groups or imicros-acl will be used, the user must be added to ctx.meta - at least user.id and user.email.  
```js
let param = {
    token: token                // valid token (received as return value from login)
}
broker.call("users.resolveToken", param).then(user => {
    // in case of a successful call it returns
    //  {
    //      user: user object
    //  }
})
```
#### me
For REST call via API. Must be authorized by token - ctx.meta.user.id is then filled and the user is returned.
```js
broker.call("users.me", param).then(user => {
    // in case of a successful call it returns
    //  {
    //      user: user object
    //  }
})
```


