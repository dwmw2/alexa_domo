'use strict'
let handleControl = require('./domo-code/Control')
let handleDiscovery = require('./domo-code/Discovery')

// Lambda handler for Alexa Smart Home API v3
let func = function (event, context) {
  // v3 API uses event.directive.header, v2 uses event.header
  const header = event.directive ? event.directive.header : event.header
  
  if (!header || !header.namespace) {
    console.log('Error: Invalid event structure', JSON.stringify(event))
    context.fail('Invalid request format')
    return
  }
  
  const namespace = header.namespace
  
  // Handle v3 API
  if (namespace === 'Alexa.Discovery') {
    handleDiscovery(event, context)
  } else if (namespace.startsWith('Alexa')) {
    // All other Alexa.* namespaces are control/query operations
    handleControl(event, context)
  } 
  // Handle legacy v2 API (for backwards compatibility)
  else if (namespace === 'Alexa.ConnectedHome.Discovery') {
    handleDiscovery(event, context)
  } else if (namespace === 'Alexa.ConnectedHome.Control' || namespace === 'Alexa.ConnectedHome.Query') {
    handleControl(event, context)
  } 
  else {
    console.log('Error: Unsupported namespace:', namespace)
    context.fail('Unsupported namespace: ' + namespace)
  }
}

exports.handler = func
