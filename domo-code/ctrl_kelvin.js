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

module.exports = function (idx, kelvin, sendback) {
  api.Kelvin({
    idx: idx,
    kelvin: kelvin
  }, function (err, device) {
    let payload
    if (!err && device.status === 'OK') {
      let payload = {
        achievedState: {
          colorTemperature: {
            value: kelvin
          }
        }
      }
    }
    else {
      payload = 'Err'
    }

    sendback(payload)
  })
}
