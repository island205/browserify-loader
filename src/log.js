var debug = true
module.exports = function() {
  if (debug) {
    console.log.apply(console, arguments)
  }
}
exports.enable = function() {
  debug = true
}

exports.disable = function() {
  debug = false
}