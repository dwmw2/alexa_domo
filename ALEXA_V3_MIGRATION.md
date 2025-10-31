# Alexa Smart Home API v3 Migration

## Summary
Successfully migrated from Alexa Smart Home API v2 to v3.

## Key Changes

### 1. Discovery Response Format
**v2:**
```json
{
  "header": {...},
  "payload": {
    "discoveredAppliances": [...]
  }
}
```

**v3:**
```json
{
  "event": {
    "header": {...},
    "payload": {
      "endpoints": [...]
    }
  }
}
```

### 2. Endpoint Structure
- v2 used `appliances` with `actions` array
- v3 uses `endpoints` with `capabilities` array
- v2 `additionalApplianceDetails` → v3 `cookie`
- Added `displayCategories` for device classification

### 3. Control Response Format
**v2:**
```json
{
  "header": {...},
  "payload": {...}
}
```

**v3:**
```json
{
  "event": {
    "header": {...},
    "endpoint": {...},
    "payload": {}
  },
  "context": {
    "properties": [...]
  }
}
```

### 4. Directive Structure
- v2: `event.header.name` (e.g., `TurnOnRequest`)
- v3: `event.directive.header.namespace` + `name` (e.g., `Alexa.PowerController` + `TurnOn`)

### 5. Capabilities Mapping

| Device Type | v2 Actions | v3 Interfaces |
|------------|-----------|---------------|
| Lights | turnOn, turnOff, setPercentage | PowerController, BrightnessController, ColorController, ColorTemperatureController |
| Scenes | turnOn, turnOff | SceneController |
| Locks | getLockState, setLockState | LockController |
| Thermostats | setTargetTemperature, etc. | ThermostatController, TemperatureSensor |
| Blinds | turnOn, turnOff | PowerController |

## Files Modified

1. **HeaderGen.js** - Updated to v3 header format with correlationToken
2. **get_Devices.js** - Converted to endpoints with capabilities
3. **Control.js** - Complete rewrite for v3 directive handling
4. **Discovery.js** - Updated to handle v3 directive structure
5. **test-discovery.js** - Updated test format

## Testing

Run tests:
```bash
node test-discovery.js      # Discovery
node test-control-v3.js     # Power control
node test-brightness-v3.js  # Brightness control
node test-scene-v3.js       # Scene activation
```

## Discovered Devices (34 total)
- 9 Scenes (scene_2 to scene_10)
- 15 Lights/Switches (341-348, 451, 512, 515-518, 522, 530, 571, 587, 593, 599)
- 4 Temperature sensors (507, 508, 510, 521)
