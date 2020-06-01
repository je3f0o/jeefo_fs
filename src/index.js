/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : index.js
* Created at  : 2020-06-01
* Updated at  : 2020-06-01
* Author      : jeefo
* Purpose     :
* Description :
* Reference   :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
// ignore:start
"use strict";

/* globals*/
/* exported*/

// ignore:end

const fs  = require("@jeefo/fs");
//const _fs = require("fs").promises;

async function c () {
    await fs.stat('./dawdawd');
}
async function b () {
    await c();
}
async function a () {
    await b();
}

(async () => {
    await a();
    console.log("done.");
})().catch(e => {
    console.error(e);
});


//console.log(Object.getOwnPropertyNames(fs));
