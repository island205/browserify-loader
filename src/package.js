var Util = require('./util')
var xhr = require('xhr')
var log = require('./log')
var path = require('path-browserify')

function Package(pathname) {
  this.pathname = pathname
}

pkProto = Package.prototype

pkProto.getPackageJson = function(done) {
  var packageJsonURI = Util.getFileURI(this.pathname, '/package.json')
  xhr({
    uri: packageJsonURI,
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      return done(err)
    }
    try {
      done(err, JSON.parse(body))
    } catch (err) {
      done(err)
    }
  })
}

pkProto.getMainModule = function(done) {
  var that = this
  this.getPackageJson(function(err, packageJson) {
    if (err) {
      return done(err)
    }
    log("package.getMainModule", packageJson)
    var mainScriptPath = packageJson.main || 'index.js'
    mainScriptPath = path.normalize(that.pathname + mainScriptPath)
    log("package.getMainModule", mainScriptPath)
    var mainModule = new Module(mainScriptPath)
    done(null, mainModule)
  })
}

pkProto.start = function(done) {
  log("module.start")
  this.getMainModule(function(err, mainModule) {
    if (err) {
      return done(err)
    }
    log("package.start", mainModule)
    mainModule.start(done)
  })
}

module.exports = Package