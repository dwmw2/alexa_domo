'use strict'
const https = require('https')
const http = require('http')

class Domoticz {
  constructor(config) {
    this.config = config
    this.client = config.protocol === 'https' ? https : http
  }

  request(path, callback) {
    const auth = `${this.config.username}:${this.config.password}`
    const options = {
      hostname: this.config.host,
      port: this.config.port,
      path: path,
      auth: auth
    }

    this.client.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          callback(null, JSON.parse(data))
        } catch (e) {
          callback(e)
        }
      })
    }).on('error', callback)
  }

  getDevice(params, callback) {
    this.request(`/json.htm?type=devices&rid=${params.idx}`, callback)
  }

  getDevices(params, callback) {
    this.request('/json.htm?type=devices&filter=all&used=true', callback)
  }

  changeSwitchState(params, callback) {
    let path = `/json.htm?type=command&idx=${params.idx}`
    
    if (params.type === 'dimmable') {
      path += `&level=${Math.round(params.state)}&switchcmd=Set+Level&param=switchlight`
    } else {
      if (params.type === 'switch') path += '&param=switchlight'
      const state = params.state === 'toggle' ? 'Toggle' : 
                    params.state === 'on' ? 'On' : 
                    params.state === 'off' ? 'Off' : params.state
      path += `&switchcmd=${encodeURIComponent(state)}`
    }
    
    this.request(path, callback)
  }

  changeSceneState(params, callback) {
    const state = params.state === 'on' ? 'On' : 'Off'
    this.request(`/json.htm?type=command&param=switchscene&idx=${params.idx}&switchcmd=${state}`, callback)
  }

  uTemp(params, callback) {
    this.request(`/json.htm?type=command&param=udevice&idx=${params.idx}&nvalue=0&svalue=${params.value}`, callback)
  }

  Kelvin(params, callback) {
    this.request(`/json.htm?type=command&param=setkelvinlevel&idx=${params.idx}&kelvin=${params.kelvin}`, callback)
  }

  setColour(params, callback) {
    this.request(`/json.htm?type=command&param=setcolbrightnessvalue&idx=${params.idx}&hue=${params.hue}&brightness=${params.brightness}&iswhite=false`, callback)
  }
}

module.exports = Domoticz
