var Util = require('./util')
var xhr = require('xhr')
var log = require('./log')

function Package(uri) {
  this.uri = uri
}

pkProto = Package.prototype

pkProto.getPackageJson = function(done) {
  var packageJsonURI = Util.getFileURI(this.uri, '/package.json')
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
  log('getMainModule')
  this.getPackageJson(function(err, packageJson) {
    if (err) {
      return done(err)
    }
    var mainScript = packageJson.main || 'index.js'
    Util.getScriptContent(mainScript, function(err, scriptContent) {
      if (err) {
        return done(err)
      }
      var mainModule = new Module(rootScript, scriptContent)
      done(null, mainModule)
    })
  })
}

pkProto.start = function(done) {
  this.getMainModule(function(err, mainModule) {
    if (err) {
      return done(err)
    }
    mainModule.start(done)
  })
}

module.exports = Package