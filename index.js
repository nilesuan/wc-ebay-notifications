'use strict';

global.fs = require('fs');
global.util = require('util');

global.debug = true; // set to false upon production

var files = fs.readdirSync(__dirname + '/children/');
files.forEach(file => {
    if(file.indexOf('.js') > -1) {
        var base = file.slice(0, - 3);
        module.exports[base] = require(__dirname + '/children/' + file);
    }
});

global.nlog = function(message, code) {
    var message = (typeof message === 'undefined') ? '' : message;
    var code = (typeof code === 'undefined') ? 0 : code;
    switch (code) {
        case 1:
            if(debug) console.log('[debug] ' + util.inspect(message, false, null));
            break; // var dump output
        case 2:
            console.log('[notice] ' + util.inspect(message, false, null));
            break; // notice output
        case 3:
            console.log('[warning] ' + util.inspect(message, false, null));
            break; // warning output
        case 4:
            console.log('[error] ' + util.inspect(message, false, null));
            break; // error output
        default:
            if(!message instanceof Error) { console.log(message); } else {
                console.log('[error] ' + util.inspect(message, false, null));
            }
            break;
    }
};

module.exports.handler = (event, context, callback) => {
    nlog('initializing lambda', 1);
    context.callbackWaitsForEmptyEventLoop = false;
    event.function = event.params.header.soapaction;

    if (typeof event.function === 'undefined') {
        callback(new Error('function name is undefined')); return false;
    }
    
    if (!fs.existsSync(__dirname + '/children/' + event.function + '.js')) {
        callback(new Error('the file for ' + event.function + ' does not exist')); return false;
    }
    
    if (typeof this[event.function] !== 'function') {
        callback(new Error(event.function + ' is not a valid function')); return false;
    }
    
    try {
        nlog('executing ' + event.function, 1);
        this[event.function](event, function(error, data) {
            if(error) { nlog(error, 4); callback(error); }
            else { nlog(data); callback(null, data); }
            nlog(event.function + ' terminated', 1);
            return true;
        });
    }
    catch (error) {  nlog(error); callback(error); return false; }
};