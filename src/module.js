function Module(uri, scriptContent) {
  this.uri = uri
  this.scriptContent = scriptContent
}

mdProto = Module.prototype

mdProto.start = function(done) {
  done(null, true)
}
module.exports = Module