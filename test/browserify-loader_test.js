test('getFileURI', function() {
  var origin = location.origin
  equal(BL.getFileURI('/pacakge.json'), origin + '/pacakge.json')
  equal(BL.getFileURI('./package.json'), origin + '/test/package.json')
  equal(BL.getFileURI('package.json'),  origin + '/test/package.json')
  equal(BL.getFileURI('../../package.json'), origin + '/package.json')
})

test('getScriptContent', function() {
  stop()
  equal(BL.getScriptContent('/test/temp.js', function(err, body) {
    start()
    equal(body, "var temp = 'test';console.log(temp)")
  }))
})

test('getModuleDependences', function() {
  deepEqual(BL.getModuleDependences('require("xhr")'), ['xhr'])
})

test('createModule', function() {
  BL.createModule('http://javascript.com/alert.js')
  deepEqual(window.modules['http://javascript.com/alert.js'], {
    uri :'http://javascript.com/alert.js'
  })
})

test('defineModule', function() {
  BL.defineModule('console.log(1)', 'http://javascript.com/alert.js')
  equal(window.modules['http://javascript.com/alert.js'].factory, 'function (require, exports, module) {\nconsole.log(1)\n}')
})

test('compileModule', function() {
  BL.compileModule('http://javascript.com/alert.js')
  ok(true)
})

test('loadModule', function () {
  var origin = location.origin
  BL.runModule(origin + '/test/bar.js')
  ok(true)
})