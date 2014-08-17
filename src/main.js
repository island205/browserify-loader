var Module = require('./module')
var Package = require('./package')

window.define = Module.define

function run() {
  var pkg = new Package(location.origin)
  pkg.run()
}
run()