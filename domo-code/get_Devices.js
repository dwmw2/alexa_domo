/* eslint-disable max-len */
'use strict'

const Domoticz = require('./domoticz')

const conf = require('../conf.json')
const api = new Domoticz({
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  username: conf.username,
  password: conf.password
})
let log = require('./logger')
const makeHeader = require('./HeaderGen')
const handleError = require('./handleError')

module.exports = function (event, context, passBack) {
  const endpoints = []
  const headers = makeHeader(event, 'Discover.Response', 'Alexa.Discovery')
  
  api.getDevices({}, function (err, devices) {
    if (err) {
      log('error:', err)
      handleError(event, context, 'TargetBridgeConnectivityUnstableError')
      return
    }
    const devArray = devices.result
    const linkedDevices = new Set() // Track devices that are linked and should be hidden
    
    // First pass: find linked setpoint/temperature pairs
    const setpointLinks = new Map()
    if (devArray) {
      devArray.forEach(device => {
        if (device.Type === 'Thermostat' && (device.PlanID !== '0' && device.PlanID !== '')) {
          const baseName = device.Name.replace(/\s+(Setpoint|SetPoint)$/i, '')
          const tempDevice = devArray.find(d => 
            d.Name === baseName + ' Temperature' && 
            d.Type.startsWith('Temp') &&
            d.PlanID !== '0' && d.PlanID !== ''
          )
          if (tempDevice) {
            setpointLinks.set(tempDevice.idx, device.idx)
            linkedDevices.add(device.idx) // Hide the setpoint device
          }
        }
      })
    }
    
    if (devArray) {
      for (let i = 0; i < devArray.length; i++) {
        const device = devArray[i]
        
        if (device.PlanID === '0' || device.PlanID === '') { continue }
        if (linkedDevices.has(device.idx)) { continue } // Skip linked setpoint devices

        const devType = device.Type
        let setSwitch = device.SwitchType || null

        let devName = device.Name
        if (device.Description !== '') {
          const regex = /Alexa_Name:\s*(.+)/im
          const match = regex.exec(device.Description)
          if (match !== null) {
            devName = match[1].trim()
          }
        }

        let endpoint = {
          endpointId: device.idx,
          manufacturerName: device.HardwareName,
          friendlyName: devName,
          description: devType,
          displayCategories: [],
          capabilities: []
        }

        if (devType.startsWith('Scene') || devType.startsWith('Group')) {
          endpoint.endpointId = 'scene_' + device.idx
          endpoint.displayCategories = ['SCENE_TRIGGER']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.SceneController',
              version: '3',
              supportsDeactivation: false
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'scene',
            SceneIDX: parseInt(device.idx) + 200
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Light')) {
          endpoint.displayCategories = ['LIGHT']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.PowerController',
              version: '3',
              properties: {
                supported: [{ name: 'powerState' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa.BrightnessController',
              version: '3',
              properties: {
                supported: [{ name: 'brightness' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa.ColorController',
              version: '3',
              properties: {
                supported: [{ name: 'color' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa.ColorTemperatureController',
              version: '3',
              properties: {
                supported: [{ name: 'colorTemperatureInKelvin' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            maxDimLevel: device.maxDimLevel,
            switchis: setSwitch,
            WhatAmI: 'light'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Blind') || devType.startsWith('RFY')) {
          endpoint.displayCategories = ['INTERIOR_BLIND']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.PowerController',
              version: '3',
              properties: {
                supported: [{ name: 'powerState' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            switchis: setSwitch,
            WhatAmI: 'blind'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Lock') || devType.startsWith('Contact')) {
          endpoint.displayCategories = ['SMARTLOCK']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.LockController',
              version: '3',
              properties: {
                supported: [{ name: 'lockState' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            switchis: setSwitch,
            WhatAmI: 'lock'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Temp + Humidity')) {
          endpoint.displayCategories = ['TEMPERATURE_SENSOR']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa.HumiditySensor',
              version: '3',
              properties: {
                supported: [{ name: 'humidity' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'humidity'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Humidity')) {
          endpoint.displayCategories = ['OTHER']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.HumiditySensor',
              version: '3',
              properties: {
                supported: [{ name: 'humidity' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'humidity'
          }
          endpoints.push(endpoint)
        } else if (devType === 'Thermostat') {
          endpoint.displayCategories = ['THERMOSTAT']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.ThermostatController',
              version: '3',
              properties: {
                supported: [
                  { name: 'targetSetpoint' }
                ],
                proactivelyReported: false,
                retrievable: true
              }
            }
          ]
          
          // Check if device has temperature reading or find related temperature device
          let hasTemp = device.Temp !== undefined
          let tempDeviceIdx = null
          
          if (!hasTemp) {
            // Try to find related temperature device by name
            const baseName = device.Name.replace(/\s+(Setpoint|SetPoint)$/i, '')
            const tempDevice = devArray.find(d => 
              d.Name === baseName + ' Temperature' && 
              d.Type.startsWith('Temp') &&
              d.PlanID !== '0' && d.PlanID !== ''
            )
            if (tempDevice) {
              hasTemp = true
              tempDeviceIdx = tempDevice.idx
            }
          }
          
          if (hasTemp) {
            endpoint.capabilities.push({
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            })
          }
          
          endpoint.capabilities.push({
            type: 'AlexaInterface',
            interface: 'Alexa',
            version: '3'
          })
          
          endpoint.cookie = {
            WhatAmI: 'temp',
            tempDeviceIdx: tempDeviceIdx
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Temp')) {
          endpoint.displayCategories = ['TEMPERATURE_SENSOR']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            }
          ]
          
          // Check if this temperature device has a linked setpoint
          const setpointIdx = setpointLinks.get(device.idx)
          if (setpointIdx) {
            // Add thermostat controller capability
            endpoint.displayCategories = ['THERMOSTAT']
            endpoint.capabilities.unshift({
              type: 'AlexaInterface',
              interface: 'Alexa.ThermostatController',
              version: '3',
              properties: {
                supported: [
                  { name: 'targetSetpoint' }
                ],
                proactivelyReported: false,
                retrievable: true
              }
            })
            endpoint.cookie = {
              WhatAmI: 'temp',
              setpointDeviceIdx: setpointIdx
            }
          } else {
            endpoint.cookie = {
              WhatAmI: 'temp'
            }
          }
          
          endpoint.capabilities.push({
            type: 'AlexaInterface',
            interface: 'Alexa',
            version: '3'
          })
          endpoints.push(endpoint)
        } else if (devType === 'Weight') {
          endpoint.displayCategories = ['OTHER']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.RangeController',
              version: '3',
              instance: 'Weight.Weight',
              capabilityResources: {
                friendlyNames: [
                  {
                    '@type': 'text',
                    value: {
                      text: 'Weight',
                      locale: 'en-US'
                    }
                  }
                ]
              },
              properties: {
                supported: [
                  {
                    name: 'rangeValue'
                  }
                ],
                proactivelyReported: false,
                retrievable: true,
                nonControllable: true
              },
              configuration: {
                supportedRange: {
                  minimumValue: 0,
                  maximumValue: 100,
                  precision: 0.01
                },
                unitOfMeasure: 'Weight.Kilograms'
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'weight'
          }
          endpoints.push(endpoint)
        }
      }
    }
    
    const result = {
      event: {
        header: headers,
        payload: {
          endpoints: endpoints
        }
      }
    }
    passBack(result)
  })
}
