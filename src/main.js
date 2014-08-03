var path = require('path-browserify')
var xhr = require('xhr')
var RSVP = require('rsvp')

var STATUS = {
  INIT: 0,
  FETCHING: 1,
  SAVED: 2,
  LOADING: 3,
  LOADED: 4,
  EXECUTING: 5,
  EXECUTED: 6
}

var debug = false

function log() {
  if (debug) {
    console.log.apply(console, arguments)
  }
}

function getFileURI(from, to) {
  if (typeof from === 'undefined') {
    from = location.pathname
  }
  return location.origin + path.resolve(from, to)
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