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
        if (typeof object === "object" && object != null ) {
            Object.keys(object).forEach(function(key /*,index*/) {
                // key: the name of the object key
                // index: the ordinal position of the key within the object 
                if ((typeof object[key] === "object")) {
                    visitor(object[key]);
                } else {
                    // try to replace by given object path
                    object[key] = getValue(input, object[key]) || object[key];
                }
                
            });
        }
    };

    if (input) {
        visitor(output);
    }
    return output;
};