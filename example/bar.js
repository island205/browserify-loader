var foo = require('./foo.js')
var xhr = require('xhr')
var data = require('./data')
console.log(data)
require('./main')
exports.bar = function () {
  foo.foo()
}