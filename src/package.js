"use strict";

var Module = require('./module')
var EventEmitter = require('wolfy87-eventemitter')
var url = require('url')
var xhr = require('xhr')

function Package(uri) {
  this.uri = uri
  this.ee = new EventEmitter
}


Package.prototype.load = function () {
  this.ee.on('packageLoaded', function(){
    var mainScriptPath = this.pkg.main || 'index.js'
    var mainScriptUri = url.resolve(this.uri, mainScriptPath)
    var mainModule = new Module(mainScriptUri)
    mainModule.ee.on('loaded', function(){
      this.ee.trigger('mainModuleLoaded')
    }.bind(this))
  }.bind(this))
  this.loadPackage()
}

Package.prototype.loadPackage = function () {
  xhr({
    uri: this.uri,
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      this.ee.trigger('packageLoadErr', err)
    }
    try {
      this.pkg = JSON.parse(body)
      this.ee.trigger('packageLoaded')
    } catch (err) {
      this.ee.trigger('packageLoadErr', err)
    }
  }.bind(this))
}

Package.prototype.run = function () {
  this.ee.on('mainModuleLoaded', function() {
    this.mainModule.run()
  }.bind(this))
  this.load()
}

module.exports = Package