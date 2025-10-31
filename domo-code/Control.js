/* eslint-disable max-len */
'use strict'

let hsl = require('../node_modules/hsl-to-hex')
let ctrlTemp = require('./ctrl_temp')
let ctrlDev = require('./ctrl_dev')
let getDev = require('./get_dev')
let ctrlScene = require('./ctrl_scene')
let ctrlColour = require('./ctrl_colour')
let ctrlKelvin = require('./ctrl_kelvin')
const makeHeader = require('./HeaderGen')
let log = require('./logger')

module.exports = function (event, context) {
  const directive = event.directive
  const header = directive.header
  const endpoint = directive.endpoint
  const payload = directive.payload
  
  const endpointId = endpoint.endpointId
  const cookie = endpoint.cookie || {}
  const what = cookie.WhatAmI
  const switchtype = cookie.switchis
  const maxDimLevel = cookie.maxDimLevel

  const namespace = header.namespace
  const name = header.name

  const responseHeader = makeHeader(directive, 'Response', 'Alexa')
  
  const buildResponse = (properties = []) => {
    return {
      event: {
        header: responseHeader,
        endpoint: {
          endpointId: endpointId
        },
        payload: {}
      },
      context: {
        properties: properties
      }
    }
  }

  const buildErrorResponse = (type, message) => {
    const errorHeader = makeHeader(directive, type, 'Alexa')
    return {
      event: {
        header: errorHeader,
        endpoint: {
          endpointId: endpointId
        },
        payload: {
          message: message
        }
      }
    }
  }

  switch (namespace) {
    case 'Alexa.PowerController':
      let funcName = name === 'TurnOn' ? 'On' : 'Off'
      ctrlDev('switch', endpointId, funcName, function (callback) {
        if (callback === 'Err') {
          context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
          return
        }
        const properties = [{
          namespace: 'Alexa.PowerController',
          name: 'powerState',
          value: name === 'TurnOn' ? 'ON' : 'OFF',
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 500
        }]
        context.succeed(buildResponse(properties))
      })
      break

    case 'Alexa.BrightnessController':
      if (name === 'SetBrightness') {
        let brightness = payload.brightness
        let dimLevel = brightness / (100 / maxDimLevel)
        ctrlDev('dimmable', endpointId, dimLevel, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.BrightnessController',
            name: 'brightness',
            value: brightness,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustBrightness') {
        let delta = payload.brightnessDelta
        getDev(endpointId, what, function (returnme) {
          let current = parseInt(returnme)
          let newBrightness = Math.max(0, Math.min(100, current + delta))
          let dimLevel = newBrightness / (100 / maxDimLevel)
          ctrlDev('dimmable', endpointId, dimLevel, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.BrightnessController',
              name: 'brightness',
              value: newBrightness,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa.ColorController':
      let hue = payload.color.hue
      let saturation = payload.color.saturation
      let brightness = payload.color.brightness
      let hex = hsl(hue, saturation, brightness).replace(/^#/, '')
      
      ctrlColour(endpointId, hex, brightness, function (callback) {
        if (callback === 'Err') {
          context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
          return
        }
        const properties = [{
          namespace: 'Alexa.ColorController',
          name: 'color',
          value: { hue, saturation, brightness },
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 500
        }]
        context.succeed(buildResponse(properties))
      })
      break

    case 'Alexa.ColorTemperatureController':
      if (name === 'SetColorTemperature') {
        let kelvin = payload.colorTemperatureInKelvin
        ctrlKelvin(endpointId, kelvin, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.ColorTemperatureController',
            name: 'colorTemperatureInKelvin',
            value: kelvin,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      }
      break

    case 'Alexa.SceneController':
      let sceneIdx = parseInt(cookie.SceneIDX) - 200
      ctrlScene(sceneIdx, 'On', function (callback) {
        if (callback === 'Err') {
          context.succeed(buildErrorResponse('ErrorResponse', 'Scene activation failed'))
          return
        }
        const activationHeader = makeHeader(directive, 'ActivationStarted', 'Alexa.SceneController')
        context.succeed({
          event: {
            header: activationHeader,
            endpoint: {
              endpointId: endpointId
            },
            payload: {
              cause: { type: 'VOICE_INTERACTION' },
              timestamp: new Date().toISOString()
            }
          }
        })
      })
      break

    case 'Alexa.LockController':
      if (name === 'Lock' || name === 'Unlock') {
        let lockFunc = name === 'Lock' ? 'On' : 'Off'
        ctrlDev(switchtype, endpointId, lockFunc, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.LockController',
            name: 'lockState',
            value: name === 'Lock' ? 'LOCKED' : 'UNLOCKED',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      }
      break

    case 'Alexa.ThermostatController':
      if (name === 'SetTargetTemperature') {
        let temp = payload.targetSetpoint.value
        ctrlTemp(endpointId, temp, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.ThermostatController',
            name: 'targetSetpoint',
            value: { value: temp, scale: 'CELSIUS' },
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustTargetTemperature') {
        let delta = payload.targetSetpointDelta.value
        getDev(endpointId, what, function (returnme) {
          let current = parseFloat(returnme)
          let newTemp = current + delta
          ctrlTemp(endpointId, newTemp, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.ThermostatController',
              name: 'targetSetpoint',
              value: { value: newTemp, scale: 'CELSIUS' },
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa':
      if (name === 'ReportState') {
        // Query current state of device
        const properties = []
        
        // Check what capabilities this device has based on cookie
        if (what === 'temp') {
          // Get setpoint for thermostat
          getDev(endpointId, what, function (setpointData) {
            if (setpointData !== 'Err' && setpointData.value1 !== undefined) {
              properties.push({
                namespace: 'Alexa.ThermostatController',
                name: 'targetSetpoint',
                value: { value: parseFloat(setpointData.value1), scale: 'CELSIUS' },
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            
            // If there's a linked temperature device, get its reading
            if (cookie.tempDeviceIdx) {
              getDev(cookie.tempDeviceIdx, 'temp', function (tempData) {
                if (tempData !== 'Err' && tempData.value1 !== undefined) {
                  properties.push({
                    namespace: 'Alexa.TemperatureSensor',
                    name: 'temperature',
                    value: { value: parseFloat(tempData.value1), scale: 'CELSIUS' },
                    timeOfSample: new Date().toISOString(),
                    uncertaintyInMilliseconds: 500
                  })
                }
                context.succeed(buildResponse(properties))
              })
            } else {
              context.succeed(buildResponse(properties))
            }
          })
        } else if (what === 'humidity') {
          // Get temperature and/or humidity
          getDev(endpointId, what, function (data) {
            if (data !== 'Err' && data.value1) {
              properties.push({
                namespace: 'Alexa.TemperatureSensor',
                name: 'temperature',
                value: { value: parseFloat(data.value1), scale: 'CELSIUS' },
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            if (data !== 'Err' && data.value2) {
              properties.push({
                namespace: 'Alexa.HumiditySensor',
                name: 'humidity',
                value: parseInt(data.value2),
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            context.succeed(buildResponse(properties))
          })
        } else if (what === 'light') {
          // Get power state and brightness
          getDev(endpointId, what, function (data) {
            if (data !== 'Err') {
              const level = parseInt(data)
              properties.push({
                namespace: 'Alexa.PowerController',
                name: 'powerState',
                value: level > 0 ? 'ON' : 'OFF',
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
              if (maxDimLevel) {
                properties.push({
                  namespace: 'Alexa.BrightnessController',
                  name: 'brightness',
                  value: level,
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              }
            }
            context.succeed(buildResponse(properties))
          })
        } else {
          context.succeed(buildErrorResponse('ErrorResponse', 'State report not supported for this device'))
        }
      }
      break

    default:
      context.succeed(buildErrorResponse('ErrorResponse', 'Unsupported directive'))
  }
}
