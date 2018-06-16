/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

/*
function setToValue(obj, path, value) {
    let i;
    path = path.split(".");
    for (i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) obj[path[i]] = {};
        obj = obj[path[i]];
    }
    obj[path[i]] = value;
}
*/

function getValue(obj, path) {
    if (!path || typeof path !== "string" ) return null;
    let i;
    path = path.split(".");
    for (i = 0; i < path.length; i++) {
        if (!obj[path[i]]) {obj = null; break;}
        obj = obj[path[i]];
    }
    return obj;
}

module.exports = (output, input) => {

    let visitor = object => {
        if (typeof object === "object") {
            for (let property in object) {
                if (object.hasOwnProperty(property)) {
                    if ((typeof object[property] === "object")) {
                        visitor(object[property]);
                    } else {
                        // ty to replace by given object path
                        object[property] = getValue(input, object[property]) || object[property];
                    }
                }
            }
        }
    };

    if (input) {
        visitor(output);
    }
    return output;
};