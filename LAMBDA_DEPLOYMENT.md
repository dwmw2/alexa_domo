# AWS Lambda Deployment

## Runtime Configuration

**Recommended Runtime**: Node.js 18.x or later

The nodejs4.3 runtime is deprecated. Update your Lambda function to use a modern Node.js runtime.

## Update Lambda Runtime

### Via AWS Console:
1. Go to AWS Lambda Console
2. Select your function
3. Go to "Code" tab
4. Under "Runtime settings", click "Edit"
5. Change Runtime to: **Node.js 18.x** (or latest available)
6. Save changes

### Via AWS CLI:
```bash
aws lambda update-function-configuration \
  --function-name <your-function-name> \
  --runtime nodejs18.x
```

## Handler Configuration

The Lambda handler should be configured based on the entry point:
- For Discovery: `domo-code/Discovery.handleDiscovery`
- For Control: `domo-code/Control`

Or create a main handler that routes between them.

## Deployment Package

To create a deployment package:
```bash
npm install
zip -r function.zip . -x "*.git*" -x "test-*.js" -x "*.md"
```

Then upload to Lambda via Console or CLI:
```bash
aws lambda update-function-code \
  --function-name <your-function-name> \
  --zip-file fileb://function.zip
```

## Environment Variables

Ensure `conf.json` is included in the deployment package with your Domoticz credentials.

## Testing

Use the test files locally before deploying:
- `test-discovery.js` - Test device discovery
- `test-control-v3.js` - Test power control
- `test-thermostat-state.js` - Test thermostat state
- `test-selector-state.js` - Test selector switches
