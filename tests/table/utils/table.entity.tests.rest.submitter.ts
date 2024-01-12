// This class provides a simple abstraction, and accepts the
// body and headers from debug logs for resubmission and repro
import axios, { AxiosResponse } from "axios";
import { axiosRequestConfig } from "./table.entity.tests.utils.for.rest";
import { ITableEntityTestConfig } from "./TableTestConfigFactory";
import {
  AccountSasPermissions,
  AzureNamedKeyCredential,
  AzureSASCredential,
  generateAccountSas
} from "@azure/data-tables";

/**
 * Submits POST request to Azurite table service on the path given
 * This could be modified to accept the entire URL, rather than just path
 * ToDo: Need to consider cases with query strings etc.
 *
 * @export
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {Promise<string>}
 */
export async function postToAzurite(
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${config.host}:${config.port}/${
    config.accountName
  }/${path}/?${generateSas(config)}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config);
  const result = await axios.post(url, body, requestConfig);
  return result;
}

/**
 * Submits POST request to Azurite table service on the path given
 * This could be modified to accept the entire URL, rather than just path
 * ToDo: Need to consider cases with query strings etc.
 *
 * @export
 * @param {string} hostName
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {Promise<string>}
 */
export async function postToAzuriteProductionUrl(
  hostName: string,
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${hostName}:${
    config.port
  }/${path}/?${generateSas(config)}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config, true);
  const result = await axios.post(url, body, requestConfig);
  return result;
}

/**
 * Submits GET request to Azurite table service on the path given
 *
 * @export
 * @param {string} path
 * @param {*} headers
 * @return {Promise<string>}
 */
export async function getToAzurite(
  path: string,
  headers: any,
  config: ITableEntityTestConfig,
  queryString?: string
): Promise<AxiosResponse<any, any>> {
  if (undefined === queryString) {
    queryString = "";
  }
  const url = `${config.protocol}://${config.host}:${config.port}/${config.accountName}/${path}${queryString}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config);
  const result = await axios.get(url, requestConfig);
  return result;
}

/**
 * Submits GET request to Azurite table service on the path given
 *
 * @export
 * @param {string} hostName
 * @param {string} path
 * @param {*} headers
 * @return {Promise<string>}
 */
export async function getToAzuriteProductionUrl(
  hostName: string,
  path: string,
  headers: any,
  config: ITableEntityTestConfig,
  queryString?: string
): Promise<AxiosResponse<any, any>> {
  if (undefined === queryString) {
    queryString = "";
  }
  const url = `${config.protocol}://${hostName}:${config.port}/${path}${queryString}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config, true);
  const result = await axios.get(url, requestConfig);
  return result;
}

/**
 * Generates the account SAS signature to allow raw REST to connect to storage
 * without using an SDK connection.
 * This needs to be appended to the URL.
 * @return {*}  {string}
 */
function generateSas(config: ITableEntityTestConfig): string {
  // We need a NamedKeyCredential to generate the SAS token
  const cred = new AzureNamedKeyCredential(
    config.accountName,
    config.sharedKey
  );
  // We set the permissions we want on the SAS token
  // If non is specified, only list is granted
  const permissions: AccountSasPermissions = {
    // Grants permission to list tables
    list: true,
    // Grants permission to create tables
    write: true,
    // Grants permission to create entities
    add: true,
    // Grants permission to query entities
    query: true,
    // Grants permission to delete tables and entities
    delete: true
  };

  const expiriesOn = new Date();
  expiriesOn.setDate(expiriesOn.getDate() + 1);

  // Generate an account SAS with the NamedKeyCredential and the permissions set previously
  const accountSas = generateAccountSas(cred, {
    permissions,
    expiresOn: expiriesOn
  });

  return new AzureSASCredential(accountSas).signature;
}

/**
 * Sends raw patch request to Azurite
 *
 * @export
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {*}  {Promise<AxiosResponse<any, any>>}
 */
export async function patchToAzurite(
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${config.host}:${config.port}/${
    config.accountName
  }/${path}?${generateSas(config)}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config);
  const result = await axios.patch(url, body, requestConfig);
  return result;
}

/**
 * Sends raw put request to Azurite
 *
 * @export
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {*}  {Promise<AxiosResponse<any, any>>}
 */
export async function putToAzurite(
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${config.host}:${config.port}/${
    config.accountName
  }/${path}?${generateSas(config)}`;
  try {
    const requestConfig = axiosRequestConfig(url, path, headers, config);
    const result = await axios.put(url, body, requestConfig);
    return result;
  } catch (err: any) {
    throw err;
  }
}

/**
 * Sends raw merge request to Azurite
 *
 * @export
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {*}  {Promise<AxiosResponse<any, any>>}
 */
export async function mergeToAzurite(
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${config.host}:${config.port}/${
    config.accountName
  }/${path}?${generateSas(config)}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config);
  const result = await axios({
    method: "merge",
    url,
    data: body,
    headers: requestConfig.headers
  });
  return result;
}

/**
 * Sends raw delete request to Azurite
 *
 * @export
 * @param {string} path
 * @param {string} body
 * @param {*} headers
 * @return {*}  {Promise<AxiosResponse<any, any>>}
 */
export async function deleteToAzurite(
  path: string,
  body: string,
  headers: any,
  config: ITableEntityTestConfig
): Promise<AxiosResponse<any, any>> {
  const url = `${config.protocol}://${config.host}:${config.port}/${
    config.accountName
  }/${path}?${generateSas(config)}`;
  const requestConfig = axiosRequestConfig(url, path, headers, config);
  const result = await axios({
    method: "delete",
    url,
    data: body,
    headers: requestConfig.headers
  });
  return result;
}
