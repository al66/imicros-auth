# imicros-auth
[![Build Status](https://travis-ci.org/al66/imicros-auth.svg?branch=master)](https://travis-ci.org/al66/imicros-auth)
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-auth/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-auth?branch=master)

[Moleculer](https://github.com/moleculerjs/moleculer) services for Authentication, Authorization and ACL

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
            call: "low.publisher.emit",
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
action create { email, password, locale } => { user }
#### requestConfirmationMail
action requestConfirmationMail { email } => { sent }
#### confirm
action confirm { token } => { verified }
#### requestPasswordResetMail
action requestPasswordResetMail { email } => { sent }
#### resetPassword
action resetPassword { token, password } => { result }
#### login
action login { email, password } => { user, token }
#### resolveToken
action resolveToken { token } => { user }
#### me
action me { } => { user }


