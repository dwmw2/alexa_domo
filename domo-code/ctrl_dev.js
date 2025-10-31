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

module.exports = function (switchtype, applianceId, func, sendback) {
  let payload
  api.changeSwitchState({
    type: switchtype,
    idx: applianceId,
    state: func
  }, function (err, device) {
    console.log(device)
    if (!err && device.status === 'OK') {
      payload = {}
    }
    else {
      payload = 'Err'
    }
    sendback(payload)
  })
}
