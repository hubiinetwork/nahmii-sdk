'use strict';

function dbg(...args) {
    if (process.env.LOG_LEVEL === 'debug')
        console.error(...args);
}

module.exports = dbg;
