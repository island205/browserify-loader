var path = require('path-browserify')
var log = require('./log')
var xhr = require('xhr')

function getFileURI(from, to) {
  if (typeof from === 'undefined') {
    from = location.pathname
  }
  return location.origin + path.resolve(from, to)
}

function getScriptContent(scriptURI, done) {
  log('Util.getScriptContent', scriptURI)
  xhr({
    uri: scriptURI,
    headers: {
      "Content-Type": "text/plain"
    }
  }, function(err, resp, body) {
    done(err, body)
  })
}

exports.getFileURI = getFileURI
exports.getScriptContent = getScriptContent