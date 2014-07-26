var Util = require('./util')
var log = require('./log')

function Module(scriptPath) {
  log("module", scriptPath)
  this.scriptPath = scriptPath
}

mdProto = Module.prototype

mdProto.start = function(done) {
  var that = this
  Util.getScriptContent(this.scriptPath, function(err, scriptContent) {
    if (err) {
      return done(err)
    }
    log("module.start", scriptContent)
    this.scriptContent = scriptContent
    done(null, true)
  })
}
module.exports = Module