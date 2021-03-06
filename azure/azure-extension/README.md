# @axway/amplify-central-azure-extension

AMPLIFY Central CLI extension for downloading and creating AMPLIFY Central resources for Azure.

**For more documentation and examples please visit [Unified Catalog integrations](https://github.com/Axway/unified-catalog-integrations).**

# Installation

Assuming you are familiar with [Node.js](https://nodejs.org) and [npm](https://npmjs.com), you should first install the [Axway AMPLIFY CLI](https://www.npmjs.com/package/@axway/amplify-cli), which will give you connectivity to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify). Note that you must first have an account on [https://platform.axway.com](https://platform.axway.com/), and be provisioned in AMPLIFY Central:

```bash
$ [sudo] npm install -g @axway/amplify-cli
```

Use the AMPLIFY package manager command to install the AMPLIFY Central CLI:

```bash
$ amplify pm install @axway/amplify-central-cli@dev
```

You can then install the @axway/amplify-central-azure-extension:

```bash
$ amplify pm install @axway/amplify-central-azure-extension
```

To configure this extension with the AMPLIFY Central CLI:

```bash
$ amplify central config set extensions.azure-extension '~/.axway/packages/@axway/amplify-central-azure-extension'
```

# Getting started

You must be logged into the Axway AMPLIFY Platform before uploading any generated resource files. You'll also need to setup a Service (DOSA) account. To find out how to create one visit [Get started with AMPLIFY CLI](https://docs.axway.com/bundle/axway-open-docs/page/docs/central/cli_getstarted/index.html). Log in to the [Axway AMPLIFY Platform](https://www.axway.com/en/products/amplify) using the following command:

```bash
$ amplify auth login --client-id <DOSA Service Account> --secret-file <Private Key>
```

To see available help, options and examples add `-h` or `--help` option on any command:

```bash
$ amplify auth logout -h
```

# General usage

There are two main extension commands; `config` and `resources`. You can run each command with a `-h` to get help on that specific command.

```bash
$ amplify central azure-extension -h
USAGE: amplify central azure-extension <command> [options]

Create AMPLIFY Central resources from Azure API Management APIs

AMPLIFY CENTRAL EXTENSION FOR AZURE API MANAGEMENT COMMANDS:
  config  Manage Azure Extension Configuration
  resources  Generate resources from Azure API Management APIs
```

# Commands reference:

## CONFIG

The `config` command is utilized to configure the extension prior to generating resources. There are two config sub-commands; `list` and `set`.

```text
$ amplify central azure-extension config -h
USAGE: amplify central azure-extension config <command> [options]

Manage Azure Extension Configuration

CONFIG COMMANDS:
  list  View AMPLIFY Central azure-extension configuration
  set  Set AMPLIFY Central azure-extension configuration
```

### config examples:

```bash
# set output dir for the generated resources:
$ amplify central azure-extension config set --output-dir <directory>
# view config:
$ amplify central azure-extension config list
# view list of available options
$ amplify central azure-extension config set -h

SET OPTIONS:
  --client-id=<value>  Set your Azure Client ID
  --client-secret=<value>  Set your Azure Client Secret
  --environment-name=<value>  Set environment name to create
  --filter=<value>  Set your filtering options, currently only supports a tag
  --icon=<value>  Set absolute path for custom icon
  --output-dir=<value>  Set absolute path for output directory
  --resource-group-name=<value>  Set your Azure Resource Group Name
  --service-name=<value>  Set your Azure Service Name
  --subscription-id=<value>  Set your Azure Subscription ID
  --tenant-id=<value>  Set your Azure Tenant ID
  --webhook-url=<value>  Set webhook url to use
```

---

## RESOURCES

The `resources` command is utilized to generate azure resources for Central. There is one resources sub-command: `generate`

```text
$ amplify central azure-extension resources -h

USAGE: amplify central azure-extension resources <command> [options]

Generate resources from Azure API Management APIs

RESOURCES COMMANDS:
  generate
```

### resources examples:

```
$ amplify central azure-extension resources generate
```

### Generated Files

The generate command will create AMPLIFY Central resource files for your configured Azure instance. These files will generated into either `./resources` or the directory you configured with the `--output-dir` configuration setting.

After generating these files you can modify and upload them to AMPLIFY Central with the `amplify central create -f=<file>` command. You'll want be sure to upload any Environment files before other generate resources.

```
$ amplify central create -h
USAGE: amplify central create <command> [options]

Create a resource from a file. JSON and YAML formats are accepted.

CREATE COMMANDS:
  environment   Create an environment with the specified name.

CREATE OPTIONS:
  --client-id=<value>   Override your DevOps account's client ID
  -f,--file=<path>      Filename to use to create the resource
  -o,--output=<value>   Additional output formats. One of: yaml | json
```

### create example:

```bash
# Upload the Environment, Webhook, and ConsumerSubscriptionDefinition
amplify central create -f=~/Desktop/Environment.yaml
# Upload the APIService, APIServiceRevision, APIServiceInstance, and ConsumerInstance
amplify central create -f=~/Desktop/APIService-swagger-petstore.yaml
```

---

## Author

Axway <support@axway.com> https://axway.com

## License

This code is proprietary, closed source software licensed to you by Axway. All Rights Reserved. You may not modify Axway’s code without express written permission of Axway. You are licensed to use and distribute your services developed with the use of this software and dependencies, including distributing reasonable and appropriate portions of the Axway code and dependencies. Except as set forth above, this code MUST not be copied or otherwise redistributed without express written permission of Axway. This module is licensed as part of the Axway Platform and governed under the terms of the Axway license agreement (General Conditions) located here: [https://support.axway.com/en/auth/general-conditions](https://support.axway.com/en/auth/general-conditions); EXCEPT THAT IF YOU RECEIVED A FREE SUBSCRIPTION, LICENSE, OR SUPPORT SUBSCRIPTION FOR THIS CODE, NOTWITHSTANDING THE LANGUAGE OF THE GENERAL CONDITIONS, AXWAY HEREBY DISCLAIMS ALL SUPPORT AND MAINTENANCE OBLIGATIONS, AS WELL AS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED INFRINGEMENT WARRANTIES, WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, AND YOU ACCEPT THE PRODUCT AS-IS AND WITH ALL FAULTS, SOLELY AT YOUR OWN RISK. Your right to use this software is strictly limited to the term (if any) of the license or subscription originally granted to you.
