module('util')
test('getFileURI', function() {
  var href = '/test/?notrycatch=true'
  var packagePath = '/package.json'
  equal(BL.getFileURI(packagePath, href), 'http://192.168.1.102:8000/package.json')

})
test('getPackageJson', function() {
  stop()
  var packageURI = BL.getFileURI('/package.json')
  BL.getPackageJson(packageURI, function(err, packageJSON) {
    start()
    if (err) {
      ok(false, err)
    }
    equal(packageJSON.main, 'src/main.js')
  })
})