'use strict'
let handleControl = require('./domo-code/Control')
let handleDiscovery = require('./domo-code/Discovery')

// Lambda handler for Alexa Smart Home API v3
let func = function (event, context) {
  // Normalize event structure - ensure we have directive format for v3
  let normalizedEvent = event
  
  // If event doesn't have directive but has header (v2 format), wrap it
  if (!event.directive && event.header) {
    normalizedEvent = {
      directive: {
        header: event.header,
        endpoint: event.payload && event.payload.appliance ? {
          endpointId: event.payload.appliance.applianceId,
          cookie: event.payload.appliance.additionalApplianceDetails
        } : {},
        payload: event.payload || {}
      }
    }
  }
  
  const header = normalizedEvent.directive ? normalizedEvent.directive.header : normalizedEvent.header
  
  if (!header || !header.namespace) {
    console.log('Error: Invalid event structure', JSON.stringify(event))
    context.fail('Invalid request format')
    return
  }
  
  const namespace = header.namespace
  
  // Handle v3 API
  if (namespace === 'Alexa.Discovery') {
    handleDiscovery(normalizedEvent, context)
  } else if (namespace.startsWith('Alexa')) {
    // All other Alexa.* namespaces are control/query operations
    handleControl(normalizedEvent, context)
  } 
  // Handle legacy v2 API (for backwards compatibility)
  else if (namespace === 'Alexa.ConnectedHome.Discovery') {
    handleDiscovery(normalizedEvent, context)
  } else if (namespace === 'Alexa.ConnectedHome.Control' || namespace === 'Alexa.ConnectedHome.Query') {
    handleControl(normalizedEvent, context)
  } 
  else {
    console.log('Error: Unsupported namespace:', namespace)
    context.fail('Unsupported namespace: ' + namespace)
  }
}

exports.handler = func
