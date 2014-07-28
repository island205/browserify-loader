var Util = require('./util')
var log = require('./log')
var U2 = require('uglify-js')

function Module(scriptPath) {
  log("module", scriptPath)
  this.scriptPath = scriptPath
}

mdProto = Module.prototype

mdProto.analyzeDeps = function() {
  var deps = []
  var walker = new U2.TreeWalker(function(node, descend) {
    if (node instanceof U2.AST_Call && node.expression.name === 'require') {
      var args = node.expression.args || node.args
      var child = args[0]
      if (child instanceof U2.AST_String) {
        deps.push(child.getValue())
      }
    }
  })
  var ast = U2.parse(this.scriptContent)
  ast.walk(walker)
  this.deps = deps
}

mdProto.start = function(done) {
  log("module.start")
  var that = this
  Util.getScriptContent(this.scriptPath, function(err, scriptContent) {
    if (err) {
      return done(err)
    }
    log("module.start", scriptContent)
    that.scriptContent = scriptContent
    that.analyzeDeps()
    done(null, true)
  })
}
module.exports = Module