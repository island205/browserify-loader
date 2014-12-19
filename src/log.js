"use strict";

var debug = false
module.exports = function () {
  debug && console.log.apply(console, arguments)
}