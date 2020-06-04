const request = require('request');
const fs = require('fs');
const unzipper = require('./unzipper');
const urlParser = require('url');
import { commitToFs, requestPromise } from './utils';

const ORDER = [
	'Environment',
	'APIService',
	'APIServiceRevision',
	'APIServiceInstance',
	'Webhook',
	'ConsumerSubscriptionDefinition',
	'ConsumerInstance',
];


const listAPIs = async (token, pageSize, offset, orgId) => {
	return requestPromise({
		method: 'GET',
		url: `https://anypoint.mulesoft.com/exchange/api/v2/assets?offset=${offset}&limit=${pageSize}&masterOrganizationId=${orgId}`,
		headers: { Authorization: `Basic ${token}` }
	});
};

const getAccessToken = async (username, password) => {
	return new Promise((resolve, reject) => {
		request.post(
			`https://anypoint.mulesoft.com/accounts/login`,
			{
				json: {
					username,
					password
				}
			},
			(error, response, body) => {
				if (error) reject(new Error(err));
				if (response.statusCode > 200) reject(new Error(`Bad response ${response.body}`));
				resolve(response.body);
			}
		);
	}).catch(e => {
		console.error(e);
	});
};

const assetLinkedAPI = async (token, organizationId, environmentId, assetId) => {
	return requestPromise({
		method: 'GET',
		url: `https://anypoint.mulesoft.com/apimanager/api/v1/organizations/${organizationId}/environments/${environmentId}/apis?assetId=${assetId}`,
		headers: { Authorization: `Bearer ${token}` }
	});
};

const getAssetHomePage = async (token, organizationId, groupId, assetId, version) => {
	return requestPromise({
		method: 'GET',
		url: `https://anypoint.mulesoft.com/exchange/api/v1/organizations/${organizationId}/assets/${groupId}/${assetId}/${version}/pages/home`,
		headers: { Authorization: `Bearer ${token}` }
	});
};

const getApiDetails = async (api, token) => {
	let specContent;

	//which data to fetch as a spec for the api service
	let specFileClassifier = (function(apiType) {
		switch (apiType) {
			case 'template':
				return 'mule-application-template';
			case 'example':
			case 'connector':
			case 'extension':
				return 'mule-plugin';
			case 'api-fragment':
				return 'raml-fragment';
			case 'custom':
				return 'custom';
			case 'soap-api':
				return 'wsdl';
			case 'rest-api':
				return 'oas';
			default:
				return apiType;
		}
	})(api.type);
	let fileEntries = api.files.filter(filter => filter.classifier === specFileClassifier);

	let packaging = 'txt';
	if (fileEntries.length > 0) {
		if (fileEntries[0].packaging === 'zip' && (specFileClassifier === 'oas' || specFileClassifier === 'wsdl')) {
			await unzipper.downloadAndUnzip(fileEntries[0].externalLink, fileEntries[0].mainFile).then(function(value) {
				specContent = value;
			});
			packaging = 'json';
		} else {
			specContent = await requestPromise({
				method: 'GET',
				url: fileEntries[0].externalLink,
				encoding: null,
				headers: {
					Accept: '*/*'
				}
			});
			packaging = fileEntries[0].packaging;
		}
		
	} else if (specFileClassifier === 'oas') {
		//for rest-api, there might not be an oas spec generated if it's an old asset, download raml
		fileEntries = api.files.filter(filter => filter.classifier === 'fat-raml');
		if (fileEntries.length > 0) {
			specContent = await requestPromise({
				method: 'GET',
				url: fileEntries[0].externalLink,
				encoding: null,
				headers: {
					Accept: "*/*"
				}
			});
			packaging = fileEntries[0].packaging;
		}
	} else { //majority have connector as a jar, so search for that
		fileEntries = api.files.filter(filter => filter.packaging === 'jar');
		if (fileEntries.length > 0) {
			specContent = await requestPromise({
				method: 'GET',
				url: fileEntries[0].externalLink,
				encoding: null,
				headers: {
					Accept: "*/*"
				}
			});
			packaging = fileEntries[0].packaging;
		}
	}

	let image = null;
	if (api.icon) {
		image = await requestPromise({
			method: 'GET',
			url: api.icon,
			encoding: null
		});
		image = image.toString('base64');
	}

	//get instances
	let assetDetails = JSON.parse(
		await requestPromise({
			method: 'GET',
			url: `https://anypoint.mulesoft.com/exchange/api/v2/assets/${api.id}`,
			headers: { Authorization: `Basic ${token}` }
		})
	);

	let instances = [];
	if (assetDetails && assetDetails.instances) {
		instances = assetDetails.instances;
	}

	return {
		spec: specContent,
		icon: image,
		instances: instances,
		packaging: packaging
	};
};

const generateResourcesFromMulesoftAssets = async (config = {}, log) => {
	// TODO: config validation for required params
	let resources = [];
	const {
		username,
		password,
		masterOrganizationId,
		includeMockEndpoints,
		generateConsumerInstances,
		environmentName,
		outputDir = './resources'
	} = config;
	if (!username || !password || !masterOrganizationId || !environmentName) {
		console.log("Missing required config. Run 'amplify central mulesoft-extension config set -h' to see a list of required params");
		process.exit(1);
	}

	const token = Buffer.from(username + ':' + password).toString('base64');

	let bearerToken = await getAccessToken(username, password);
	const access_token = bearerToken ? bearerToken.access_token : '';

	const pageSize = 100;
	let offset = 0;
	let entriesLeft = true;
	while (entriesLeft) {
		const apis = JSON.parse(await listAPIs(token, pageSize, offset, masterOrganizationId));
		entriesLeft = apis.length == pageSize;
		offset += pageSize;

		for (let api of apis) {
			resources = [];
			try {
				const apiDetails = await getApiDetails(api, token);
				let type = (function(apiType, spec, packaging) {
					switch (apiType) {
						case 'soap-api':
							return 'wsdl';
						case 'rest-api':
							if (packaging === "zip") {
								return "raml";
							}
							if (spec) {
								try {
									if (JSON.parse(spec).swagger) {
										return 'oas2';
									}
								} catch (e) {
									return 'custom';
								}
							}
							return 'oas3';
						default:
							return apiType;
					}
				})(api.type, apiDetails.spec, apiDetails.packaging);

				let attributes = {
					groupId: api.groupId,
					id: api.id,
					organizationId: api.organization.id,
					organizationName: api.organization.name,
					groupId: api.groupId,
					assetId: api.assetId
				};
				if (generateConsumerInstances && !(type === 'oas3' || type == 'wsdl' || type === 'oas2' || type === 'raml')) {
					const docs = await getAssetHomePage(
						access_token,
						api.organization.id,
						api.groupId,
						api.assetId,
						api.version
					);
					
					const consumerInstance = {
						apiVersion: 'v1alpha1',
						kind: 'ConsumerInstance',
						name: `${api.assetId}`.toLowerCase().replace(/\W+/g, '-'),
						title: api.name,
						attributes: attributes,
						tags: api.labels,
						metadata: {
							scope: {
								kind: 'Environment',
								name: environmentName
							}
						},
						spec: {
							state: 'PUBLISHED',
							name: `${api.name} `,
							subscription: {
								enabled: false,
								autoSubscribe: false
							},
							description: api.description,
							documentation: docs,
							version: api.versionGroup,
							tags: [api.organization.name, api.groupId.replace(/\W+/g, '-'), api.assetId, type]
						}
					};

					if (apiDetails.spec) {
						//only add unstructured data if present
						consumerInstance.spec.unstructuredDataProperties = {
							type: type,
							contentType: `application/${apiDetails.packaging}`,
							fileName: `${api.name}.${apiDetails.packaging}`,
							label: `${api.name}`,
							data: Buffer.from(apiDetails.spec).toString('base64')
						}
					}

					if (apiDetails.icon) {
						consumerInstance.spec.icon = {
							data: apiDetails.icon,
							contentType: 'image/jpeg'
						};
					}
					resources.push(consumerInstance);
					await commitToFs(consumerInstance, outputDir, [consumerInstance]);
					continue;
				}

				const apiServiceName = `${api.assetId}`.toLowerCase().replace(/\W+/g, '-');

				const apiService = {
					apiVersion: 'v1alpha1',
					kind: 'APIService',
					name: apiServiceName,
					title: api.name,
					attributes: attributes,
					tags: api.labels,
					metadata: {
						scope: {
							kind: 'Environment',
							name: environmentName
						}
					},
					spec: {
						description: api.description
					}
				};
				if (apiDetails.icon) {
					apiService.spec.icon = {
						data: apiDetails.icon,
						contentType: 'image/jpeg'
					};
				}
				resources.push(apiService);

				const apiServiceRevisionName = `${apiServiceName}-${api.version}`;
				const apiServiceRevision = {
					apiVersion: 'v1alpha1',
					kind: 'APIServiceRevision',
					name: apiServiceRevisionName,
					attributes: attributes,
					metadata: {
						scope: {
							kind: 'Environment',
							name: environmentName
						}
					},
					spec: {
						apiService: apiServiceName,
						definition: {
							type: apiDetails.spec ? type : 'custom', //if no spec present, make it custom
							value: apiDetails.spec ? Buffer.from(apiDetails.spec).toString('base64') : ''
						}
					}
				};
				resources.push(apiServiceRevision);

				const apiServiceInstance = {
					apiVersion: 'v1alpha1',
					kind: 'APIServiceInstance',
					name: apiServiceName,
					attributes: attributes,
					metadata: {
						scope: {
							kind: 'Environment',
							name: environmentName
						}
					},
					spec: {
						apiServiceRevision: apiServiceRevisionName,
						endpoint: []
					}
				};

				//add in a default instance, so we can create the apiservice instance and the consumer instance
				if (
					apiDetails.instances.filter(
						instance =>
							includeMockEndpoints ||
							(instance.endpointUri &&
								!instance.endpointUri.startsWith('https://anypoint.mulesoft.com/mocking'))
					).length == 0
				) {
					apiDetails.instances.push({ id: '' });
				}

				for (let instance of apiDetails.instances) {
					if (!instance) {
						continue;
					}
					if (
						!includeMockEndpoints &&
						instance.endpointUri &&
						instance.endpointUri.startsWith('https://anypoint.mulesoft.com/mocking')
					) {
						continue;
					}
					apiServiceInstance.name = apiServiceName + instance.id;

					if (instance.endpointUri) {
						let parsedUrl = urlParser.parse(instance.endpointUri);

						let endpoint = {
							host: parsedUrl.hostname,
							protocol: parsedUrl.protocol.substring(0, parsedUrl.protocol.indexOf(':'))
						};

						if (parsedUrl.port) {
							endpoint.port = parseInt(parsedUrl.port, 10);
						}

						if (parsedUrl.pathname) {
							endpoint.routing = { basePath: parsedUrl.pathname };
						}
						apiServiceInstance.spec.endpoint[0] = endpoint;
					} else {
						apiServiceInstance.spec.endpoint = [];
					}

					if (instance.environmentId) {
						attributes.environmentId = instance.environmentId;

						let linkedAPI = JSON.parse(
							await assetLinkedAPI(access_token, api.organization.id, instance.environmentId, api.assetId)
						);
						//need to get the API id in order to create subscriptions
						if (linkedAPI.total > 0) {
							for (let asset of linkedAPI.assets) {
								for (let api of asset.apis) {
									if (api.endpointUri === instance.endpointUri) {
										attributes.apiId = api.id;
										break;
									}
								}
							}
						}
					}

					resources.push(apiServiceInstance);

					if (generateConsumerInstances) {
						const docs = await getAssetHomePage(
							access_token,
							api.organization.id,
							api.groupId,
							api.assetId,
							api.version
						);

						//generate a consumer instance
						const consumerInstance = {
							apiVersion: 'v1alpha1',
							kind: 'ConsumerInstance',
							name: apiServiceInstance.name,
							title: api.name,
							attributes: attributes,
							tags: api.labels,
							metadata: {
								scope: {
									kind: 'Environment',
									name: environmentName
								}
							},
							spec: {
								apiServiceInstance: apiServiceInstance.name,
								state: 'PUBLISHED',
								name: `${api.name} ` + (attributes.apiId ? `for endpoint ${instance.endpointUri}` : ''),
								documentation: docs,
								subscription: {
									enabled: attributes.apiId ? true : false,
									autoSubscribe: false,
									subscriptionDefinition: 'consumersubdef'
								},
								version: api.versionGroup,
								tags: [api.organization.name, api.groupId.replace(/\W+/g, '-'), api.assetId, type]
							}
						};

						if (type === "raml") {
							consumerInstance.spec.unstructuredDataProperties = {
								type: "raml",
								contentType: `application/${apiDetails.packaging}`,
								fileName: `${apiServiceInstance.name}.${apiDetails.packaging}`,
								label: `${apiServiceInstance.name}`
							}
						}
						resources.push(consumerInstance);
					}
				}
			} catch (error) {
				console.error(error);
			}
			resources = resources.sort((l,r) =>  ORDER.indexOf(l.kind) - ORDER.indexOf(r.kind));
			await commitToFs(apiService, outputDir, resources);
		}
	}
};


module.exports = {
	generateResources: generateResourcesFromMulesoftAssets
}