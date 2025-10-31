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
let log = require('./logger')

module.exports = function (idx, devType, sendback) {
  let intRet
  api.getDevice({
    idx: idx
  }, function (err, data) {
    if (err) return sendback(null)
    
    let devArray = data.result
    if (devArray) {
            // turn this on to check the list of values the device returns
       console.log("device list", devArray)
      for (let i = 0; i < devArray.length; i++) {
        let device = devArray[i]
        let devName = device.Name
        if (device.Description !== '') {
          let regex = /Alexa_Name:\s*(.+)/im
          let match = regex.exec(device.Description)
          if (match !== null) {
            devName = match[1].trim()
          }
        }
        let callBackString = {}
        if (devType === 'temp') {
          if (device.SubType === 'SetPoint') {
            intRet = device.SetPoint
          } else {
            intRet = device.Temp
          }
          callBackString.value1 = intRet
          callBackString.value2 = devName
        } else if (devType === 'light') {
          callBackString = device.Level
        } else if (devType === 'lock') {
          callBackString = device.Status
        } else if (devType === 'weight') {
          // Extract numeric value from Data field (e.g., "53.755 kg" -> 53.755)
          const match = device.Data.match(/([0-9.]+)/)
          callBackString = match ? match[1] : '0'
        } else if (devType === 'general') {
          // Extract numeric value from Data field (e.g., "8.1 pH" -> 8.1, "95.5799%" -> 95.5799)
          const match = device.Data.match(/([0-9.]+)/)
          callBackString = match ? match[1] : '0'
        }
        sendback(callBackString)
      }
    }
  })
}
