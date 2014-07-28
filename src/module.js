var Util = require('./util')
var log = require('./log')
var U2 = require('uglify-js')
var path = require('path-browserify')
var Thenjs = require('thenjs')
var Package = require('./package')

function Module(scriptPath) {
  log("module", scriptPath)
  this.scriptPath = scriptPath
  this.status = Module.STATUS.INIT
}

Module.__cache = {}

Module.cache = function(md) {
  if (typeof md === 'string') {
    return this.__cache[md]
  } else {
    this.__cache[md.scriptPath] = md
  }
}

Module.STATUS = {
  INIT: 0,
  FETCHING: 1,
  SAVED: 2,
  LOADING: 3,
  LOADED: 4,
  EXECUTING: 5,
  EXECUTED: 6
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

mdProto.load = function(done) {
  var that = this
  Util.getScriptContent(this.scriptPath, function(err, scriptContent) {
    if (err) {
      return done(err)
    }
    that.scriptContent = scriptContent
    that.analyzeDeps()
    Thenjs.each(that.deps, function(cont, dep) {
      if (dep.slice(0, 1) == '.') {
        var scriptPath = path.normalize(path.dirname(that.scriptPath) + '/' + dep + '.js')
        if (Module.cache(scriptPath)) {
          cont(null)
          log('module.load:', scriptPath + ' is loaded')
        } else {
          var md = new Module(scriptPath)
          Module.cache(md)
          md.load(cont)
        }
      } else {
        var packagePath = path.normalize(path.dirname(that.scriptPath) + '/' + 'node_modules/' + dep + '/package.json')
        var pk = new Package(packagePath)
        pk.load(cont)
      }
    }).all(function(cont, err, results) {
      done(err, results)
    })
  })
}

mdProto.run = function() {

}
module.exports = Module