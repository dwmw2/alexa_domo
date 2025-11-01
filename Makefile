.PHONY: help deploy test-discovery test-control logs clean show-current-version

FUNCTION_NAME ?= domoticz-alexa
PROFILE ?=
AWS_REGION ?= eu-west-1

ifdef PROFILE
PROFILE_FLAG = --profile $(PROFILE)
else
PROFILE_FLAG =
endif

help:
	@echo "Available targets:"
	@echo "  deploy               - Package and deploy Lambda function"
	@echo "  test-discovery       - Test device discovery"
	@echo "  test-control         - Test device control"
	@echo "  logs                 - Tail CloudWatch logs"
	@echo "  show-current-version - Show deployed Lambda version"
	@echo "  clean                - Remove build artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  PROFILE         - AWS profile (default: none)"
	@echo "  FUNCTION_NAME   - Lambda function name (default: domoticz-alexa)"
	@echo "  AWS_REGION      - AWS region (default: eu-west-1)"

deploy:
	@test -f conf.json || (echo "Error: conf.json not found. Copy conf.json.example to conf.json and configure your Domoticz settings." && exit 1)
	@echo "Installing dependencies..."
	@npm install --silent
	@echo "Packaging and deploying Lambda function..."
	$(eval GIT_VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "unknown"))
	@echo "Version: $(GIT_VERSION)"
	zip -q -r - domapi.js conf.json domo-code/ node_modules/ \
		-x '*.swp' -x '*.swo' -x '*~' -x '*.bak' -x '.git/*' -x '.gitignore' \
		-x 'test-*.js' -x '*.md' -x 'Makefile' -x 'GNUmakefile' -x 'package-lock.json' | \
		aws lambda update-function-code \
			--function-name $(FUNCTION_NAME) \
			--zip-file fileb:///dev/stdin \
			$(PROFILE_FLAG) \
			--region $(AWS_REGION) \
			--query 'LastModified' \
			--output text
	@echo "Waiting for function update to complete..."
	@aws lambda wait function-updated \
		--function-name $(FUNCTION_NAME) \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION)
	@aws lambda update-function-configuration \
		--function-name $(FUNCTION_NAME) \
		--description "Domoticz Alexa Smart Home - $(GIT_VERSION)" \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION) \
		--query 'Description' \
		--output text
	@echo "Deployment complete"

test-discovery:
	@echo "Testing device discovery..."
	@echo '{"directive":{"header":{"namespace":"Alexa.Discovery","name":"Discover","payloadVersion":"3","messageId":"test"},"payload":{"scope":{"type":"BearerToken","token":"test"}}}}' > /tmp/discovery-payload.json
	@aws lambda invoke \
		--function-name $(FUNCTION_NAME) \
		--payload file:///tmp/discovery-payload.json \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION) \
		/tmp/discovery-response.json > /dev/null
	@jq '.event.payload.endpoints | length' /tmp/discovery-response.json | \
		xargs -I {} echo "Discovered {} devices"
	@jq -r '.event.payload.endpoints[].friendlyName' /tmp/discovery-response.json | sort

test-control:
	@echo "Testing device control (Study light on)..."
	@echo '{"directive":{"header":{"namespace":"Alexa.PowerController","name":"TurnOn","payloadVersion":"3","messageId":"test","correlationToken":"test"},"endpoint":{"scope":{"type":"BearerToken","token":"test"},"endpointId":"770","cookie":{"WhatAmI":"light"}},"payload":{}}}' > /tmp/control-payload.json
	@aws lambda invoke \
		--function-name $(FUNCTION_NAME) \
		--payload file:///tmp/control-payload.json \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION) \
		/tmp/control-response.json > /dev/null
	@jq '.' /tmp/control-response.json

logs:
	@echo "Fetching recent CloudWatch logs..."
	@aws logs filter-log-events \
		--log-group-name /aws/lambda/$(FUNCTION_NAME) \
		--start-time $$(date -d '5 minutes ago' +%s)000 \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION) \
		--query 'events[*].message' \
		--output text

show-current-version:
	@aws lambda get-function-configuration \
		--function-name $(FUNCTION_NAME) \
		$(PROFILE_FLAG) \
		--region $(AWS_REGION) \
		--query 'Description' \
		--output text

clean:
	rm -f /tmp/discovery-payload.json /tmp/discovery-response.json /tmp/control-payload.json /tmp/control-response.json
