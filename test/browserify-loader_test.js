module('util')
test('getFileURI', function() {
  var href = '/test/?notrycatch=true'
  var packagePath = '/package.json'
  equal(BL.Util.getFileURI(href, packagePath), 'http://192.168.1.102:8000/package.json')

})