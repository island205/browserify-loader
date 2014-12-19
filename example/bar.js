var foo = require('./foo.js')
var xhr = require('xhr')
var People = require('./people')
var data = require('./data')
var p = new People
p.say()
console.log(data)
require('./main')
exports.bar = function () {
  foo.foo()
}