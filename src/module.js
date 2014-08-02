var Util = require('./util')
var log = require('./log')
var U2 = require('uglify-js')
var path = require('path-browserify')
var Thenjs = require('thenjs')
var Package = require('./package')


function Module(scriptPath) {
  log("init module", scriptPath)
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
  this.status = Module.STATUS.FETCHING
  Util.getScriptContent(this.scriptPath, function(err, scriptContent) {
    if (err) {
      return done(err)
    }
    that.scriptContent = scriptContent
    that.status = Module.STATUS.SAVED
    that.analyzeDeps()
    that.status = Module.STATUS.LOADING
    Thenjs.each(that.deps, function(cont, dep) {
      if (dep.slice(0, 1) == '.') {
        var scriptPath = path.normalize(path.dirname(that.scriptPath) + '/' + dep + '.js')
        if (Module.cache(scriptPath)) {
          cont(null)
        } else {
          var md = new Module(scriptPath)
          Module.cache(md)
          md.load(cont)
        }
      } else {
        var scriptDirname = path.dirname(that.scriptPath)
        var oldScriptDirname = null
        var packagePath, pk
        var tryCount = 0
        tryToLoadPackage = function(err) {
          if (err) {
            if (scriptDirname == oldScriptDirname) {
              cont('package ' + dep + ' not found')
            } else {
              oldScriptDirname = scriptDirname
              packagePath = path.normalize(scriptDirname + '/' + 'node_modules/' + dep + '/package.json')
              log('try to load package', packagePath)
              pk = new Package.Package(packagePath)
              pk.load(tryToLoadPackage)
            }
          } else {
            cont(null)
          }
          scriptDirname = path.dirname(scriptDirname)
        }
        tryToLoadPackage('start')
      }
    }).all(function(cont, err, results) {
      if (err) {
        return done(err)
      }
      that.status = Module.STATUS.LOADED
      done(err, results)
    })
  })
}

mdProto.run = function() {

}

module.exports = Module