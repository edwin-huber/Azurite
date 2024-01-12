import { computeHMACSHA256 } from "../../../src/common/utils/utils";
import { HeaderConstants } from "../../../src/table/utils/constants";
import { ITableEntityTestConfig } from "./TableTestConfigFactory";

// Performs standard rest operations against the table service
// Uses shared key lite authentication for TableService
// will correctly handle both Azure and Azurite

/**
 * Performs a standard REST GET request using node-fetch
 * Uses shared key lite authentication for TableService
 *
 * @export
 * @param {string} path
 * @param {*} headers
 * @param {string} [queryString]
 * @return {*}  {Promise<any>}
 */
export async function standardRestGet(
  baseUrl: string,
  path: string,
  headers: any,
  config: ITableEntityTestConfig,
  queryString: string = ""
): Promise<any> {
  let headersOut = headers;

  if (config.testAzure) {
    const signingKey = Buffer.from(config.sharedKey, "base64");
    headersOut = addSharedKeyLiteAuthHeaderForAzure(
      "GET",
      baseUrl,
      path,
      headers,
      signingKey,
      config
    );
  }

  const response = await fetch(path, {
    method: "get",
    headers: headersOut
  });
  const result = await response.json();
  return result;
}

export async function standardRestPost(
  baseUrl: string,
  path: string,
  headers: any,
  body: string,
  config: ITableEntityTestConfig,
  queryString: string = ""
): Promise<any> {
  let headersOut = headers;

  if (config.testAzure) {
    const signingKey = Buffer.from(config.sharedKey, "base64");
    headersOut = addSharedKeyLiteAuthHeaderForAzure(
      "POST",
      baseUrl,
      path,
      headers,
      signingKey,
      config
    );
  }

  const response = await fetch(new URL(path, baseUrl).toString(), {
    method: "post",
    headers: headersOut,
    body: body
  });
  const result = {
    status: response.status,
    statusText: response.statusText,
    body: response.body
  };
  return result;
}

/**
 * adds authentication header for Azurite shared key lite
 *
 * @param {string} url
 * @param {string} path
 * @param {*} headersIn
 * @return {*}  {*}
 */
function addSharedKeyLiteAuthHeaderForAzure(
  verb: string,
  url: string,
  path: string,
  headersIn: any,
  signingKey: Buffer,
  config: ITableEntityTestConfig
): any {
  let headers = Object.assign(headersIn, {
    "x-ms-date": new Date().toUTCString()
  });

  const stringToSign = createStringToSignForSharedKeyLite(
    url,
    path,
    headers,
    config
  );
  const signature1 = computeHMACSHA256(stringToSign, signingKey);
  const authValue = `SharedKeyLite ${config.accountName}:${signature1}`;

  headers = Object.assign(headers, { Authorization: authValue });
  return headers;
}

/**
 * Creates the string to sing for Shared Key Lite authentication
 *
 * @param {string} baseUrl
 * @param {string} path
 * @param {*} headersIn
 */
function createStringToSignForSharedKeyLite(
  baseUrl: string,
  path: string,
  headersIn: any,
  config: ITableEntityTestConfig
): string {
  const stringToSign: string =
    getHeaderValueToSign(HeaderConstants.X_MS_DATE, headersIn) +
    "\n" +
    getCanonicalizedResourceString(
      baseUrl,
      config.accountName,
      config.productionStyleHostName !== undefined ||
        config.productionStyleHostName !== ""
        ? `/${path.replace(/'/g, "%27")}`
        : `/${config.accountName}/${path.replace(/'/g, "%27")}`
    );

  return stringToSign;
}

/**
 * Retrieve header value according to shared key sign rules.
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
 *
 * @private
 * @param {WebResource} request
 * @param {string} headerName
 * @returns {string}
 * @memberof SharedKeyCredentialPolicy
 */
function getHeaderValueToSign(headerName: string, headers: any): string {
  const value = headers[headerName];

  if (!value) {
    return "";
  }

  // When using version 2015-02-21 or later, if Content-Length is zero, then
  // set the Content-Length part of the StringToSign to an empty string.
  // https://docs.microsoft.com/en-us/rest/api/storageservices/authenticate-with-shared-key
  if (headerName === HeaderConstants.CONTENT_LENGTH && value === "0") {
    return "";
  }

  return value;
}

/**
 * Retrieves canonicalized resource string.
 * https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key#shared-key-lite-and-table-service-format-for-2009-09-19-and-later
 *
 *
 * @private
 * @param {IRequest} request
 * @returns {string}
 */
function getCanonicalizedResourceString(
  url: string,
  account: string,
  authenticationPath?: string
): string {
  let path = getPath(url) || "/";

  // For secondary account, we use account name (without "-secondary") for the path
  if (authenticationPath !== undefined) {
    path = getPath(authenticationPath);
  }

  // Append the resource's encoded URI path.

  let canonicalizedResourceString: string = "";
  canonicalizedResourceString += `/${account}${path}`;
  // If the request URI addresses a component of the resource, append the appropriate query string.
  // The query string should include the question mark and the comp parameter (for example, ?comp=metadata). No other parameters should be included on the query string.
  const queries = getURLQueries(url);
  const lowercaseQueries: { [key: string]: string } = {};
  if (queries) {
    const queryKeys: string[] = [];
    for (const key in queries) {
      if (queries.hasOwnProperty(key)) {
        const lowercaseKey = key.toLowerCase();
        lowercaseQueries[lowercaseKey] = queries[key];
        queryKeys.push(lowercaseKey);
      }
    }

    if (queryKeys.includes("comp")) {
      canonicalizedResourceString += "?comp=" + lowercaseQueries.comp;
    }

    // queryKeys.sort();
    // for (const key of queryKeys) {
    //   canonicalizedResourceString += `\n${key}:${decodeURIComponent(
    //     lowercaseQueries[key]
    //   )}`;
    // }
  }

  return canonicalizedResourceString;
}
/**
 * Retrieves path from URL.
 *
 * @private
 * @param {string} url
 * @returns {string}
 */
function getPath(url: string): string {
  if (url.indexOf("-secondary") !== -1) {
    return url.replace("-secondary", "");
  }
  return url;
}

/**
 * Get URL query key value pairs from an URL string.
 *
 * @export
 * @param {string} url
 * @returns {{[key: string]: string}}
 */
export function getURLQueries(url: string): { [key: string]: string } {
  let queryString = new URL(url).search;
  if (!queryString) {
    return {};
  }

  queryString = queryString.trim();
  queryString = queryString.startsWith("?")
    ? queryString.substr(1)
    : queryString;

  let querySubStrings: string[] = queryString.split("&");
  querySubStrings = querySubStrings.filter((value: string) => {
    const indexOfEqual = value.indexOf("=");
    const lastIndexOfEqual = value.lastIndexOf("=");
    return indexOfEqual > 0 && indexOfEqual === lastIndexOfEqual;
  });

  const queries: { [key: string]: string } = {};
  for (const querySubString of querySubStrings) {
    const splitResults = querySubString.split("=");
    const key: string = splitResults[0];
    const value: string = splitResults[1];
    queries[key] = value;
  }

  return queries;
}
