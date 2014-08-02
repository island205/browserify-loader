var Package = require('./package').Package
var Module = require('./module')
var Util = require('./util')
var log = require('./log')

var BL = window.BL = {}

function run() {
  var rootPackage = new Package('/package.json')
  rootPackage.load(function(err) {
    if (err) {
      log(err)
    }
    rootPackage.run()
  })
}
BL.Util = Util
BL.Package = Package
BL.Module = Module
BL.run = run
BL.run()