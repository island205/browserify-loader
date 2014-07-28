var Package = require('./package')
var Module = require('./module')
var Util = require('./util')

var BL = window.BL = {}

function run() {
  var rootPackage = new Package('/package.json')
  rootPackage.load(function() {
    rootPackage.run()
  })
}
BL.Util = Util
BL.Package = Package
BL.Module = Module
BL.run = run
BL.run()