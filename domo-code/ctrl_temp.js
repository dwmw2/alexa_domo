'use strict'

let Domoticz = require('./domoticz')

let conf = require('../conf.json')
let api = new Domoticz({
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  username: conf.username,
  password: conf.password
})

module.exports = function (idx, temp, sendback) {
  let payload
  api.uTemp({
    idx: idx,
    value: temp
  }, function (err, device) {
    if (!err && device.status === 'OK') {
      payload = {}
    }
    else {
      payload = 'Err'
    }
    sendback(payload)
  })
}
