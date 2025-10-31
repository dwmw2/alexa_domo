'use strict'

let listDevs = require('./get_Devices')

module.exports = function handleDiscovery (event, context) {
  listDevs(event.directive || event, context, function (passBack) {
    context.succeed(passBack)
  })
}
