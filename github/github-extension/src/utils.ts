import { outputJsonSync, pathExistsSync } from "fs-extra";
import { homedir } from "os";
import { join, resolve } from "path";
import * as fs from "fs";
const yaml = require('js-yaml');
const request = require('request');
const mime = require('mime-types');
const mkdir = require("mkdirp");

export const configFilePath = join(homedir(), ".axway", "github-extension.json");
export const ensureConfigFileExists = () => !pathExistsSync(configFilePath) && outputJsonSync(configFilePath, {});

// Creates a promise for a request 
export const requestPromise = (options: any) => {
  return new Promise((resolve, reject) => {
    request(options, (err: any, response: any) => {
      if (err) reject(new Error(err));
      if (response.statusCode > 200) reject(new Error(`Bad response ${response.body}`))
      resolve(response.body);
    });
  });
};

// Creates local yaml files given the resource params.
export const createSupportResources = async (config: any) => {
	const {
		environmentName,
		icon,
		outputDir
	} = config;

	let iconData;
	let iconPath;
	let defaultIconPath = resolve(__dirname, './assets/env_icon.png');

	// Use the custom abosolute icon path if provided/found
	if (fs.existsSync(icon)) {
		iconPath = icon;
	} else {
		iconPath = defaultIconPath;
	}
	iconData = {
		contentType: mime.lookup(iconPath),
		data: fs.readFileSync(iconPath, { encoding: 'base64' })
	}

	const environment = {
		apiVersion: 'v1alpha1',
		title: `${environmentName} Environment`,
		name: environmentName,
		kind: 'Environment',
		attributes: {
			createdBy: 'yaml',
			randomNum: 1
		},
		tags: [ 'axway', 'cli' ],
		spec: {
			description: `${environmentName} Environment`,
			icon: iconData
		}
	}

	//write yaml files to outputDir
	await commitToFs(environment, outputDir, [
		environment
	]);
}

// Given an properly orderd array of resource defs, create 1 yaml str
export const createYamlStr = (resources: Array<any>) => {
	return resources.reduce((acc = '', cur: any) => {
		const sep = '---';
		const docSep = acc === sep ? '' : sep
		return `${acc}\n${docSep}\n${yaml.dump(cur)}`
	}, '---');
}

// Write resource to file
export const writeResource = async (resource: any, directory: string, content: string) => {
	await mkdir((directory));
	fs.writeFileSync(`${directory}/${resource.kind}-${resource.name}.yaml`, content);
};

export const commitToFs = async (resource: any, outputDir: string, resources: Array<any>) => {
	await writeResource(resource, outputDir, createYamlStr(resources))
}