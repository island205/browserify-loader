var HelloMessage = require('./HelloMessage')
var React = require('../bower_components/react/react')
var mountNode = document.getElementById('mount')
React.render(<HelloMessage name="John" />, mountNode)