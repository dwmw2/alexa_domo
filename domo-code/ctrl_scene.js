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

module.exports = function (idx, func, sendback) {
  let payloads
  api.changeSceneState({
    idx: idx,
    state: func
  }, function (err, device) {
    if (!err && device.status === 'OK') {
      payloads = {}
    }
    else {
      payloads = 'Err'
    }
    sendback(payloads)
  })
}
