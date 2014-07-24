var jsp = require('uglify-js').parser
var xhr = require('xhr')
var Q = require('q')
var path = require('path-browserify')

var BL = window.BL = {}

function getFileURI(to, from) {
  if (typeof from === 'undefined') {
    from = location.pathname
  }
  return location.origin + path.resolve(from, to)
}

function getPackageJson(packageURI, done) {
  xhr({
    uri: packageURI,
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      return done(err)
    }
    try {
      done(err, JSON.parse(body))
    } catch (e) {
      done(e)
    }
  })
}

function getScriptContent(scriptURI, done) {
  xhr({
    uri: scriptURI,
    headers: {
      "Content-Type": "text/plain"
    }
  }, function(err, resp, body) {
    done(err, body)
  })
}

function start() {
  var rootPackageJsonURI = getFileURI('/package.json')
  getPackageJson(rootPackageJsonURI, function(err, packageJson) {
    var rootScript = '/' + packageJson.main || 'index.js'
    getScriptContent(rootScript, function(err, scriptContent) {
      console.log(scriptContent)
    })
  })
}

BL.getFileURI = getFileURI
BL.getPackageJson = getPackageJson
BL.start = start

BL.start()