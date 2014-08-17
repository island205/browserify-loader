var xhr = require('xhr')
var Module = require('./module')
var url = require('url')

window.define = Module.define

function bootstrap() {
  xhr({
    uri: location.origin + '/package.json',
    headers: {
      "Content-Type": "application/json"
    }
  }, function(err, resp, body) {
    if (err) {
      throw (err)
    }
    var pkg = JSON.parse(body)
    var mainScriptPath = pkg.main || 'index.js'
    var mainScriptUri = url.resolve(location.origin, mainScriptPath)
    var mainModule = new Module(mainScriptUri)
    mainModule.ee.on('loaded', function() {
      mainModule.run()
    })
    mainModule.load()
  })
}

bootstrap()