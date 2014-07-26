var jsp = require('uglify-js').parser
var Q = require('q')
var Package = require('./package')
var Module = require('./module')
var Util = require('./util')

var BL = window.BL = {}

function start(done) {
  var rootPackage = new Package(location.pathname)
  rootPackage.start(done)
}
BL.Util = Util
BL.Package = Package
BL.Module = Module
BL.start = start
BL.start(function() {})