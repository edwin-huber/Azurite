import { computeHMACSHA256 } from "../../../src/common/utils/utils";
import { HeaderConstants } from "../../../src/table/utils/constants";
import { ITableEntityTestConfig } from "./TableTestConfigFactory";
import * as assert from "assert";
import uuid from "uuid";
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

  headersOut = addAuthHeaders(config, headersOut, baseUrl, path, headers);

  const response = await fetch(new URL(path, baseUrl).toString(), {
    method: "get",
    headers: headersOut
  });

  const result = {
    status: response.status,
    statusText: response.statusText,
    body: await getReadableStreamBody(response)
  };
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

  headersOut = addAuthHeaders(config, headersOut, baseUrl, path, headers);

  const response = await fetch(new URL(path, baseUrl).toString(), {
    method: "POST",
    headers: headersOut,
    body: body
  });

  const result = {
    status: response.status,
    statusText: response.statusText,
    body: await getReadableStreamBody(response)
  };
  return result;
}

/**
 * Adds apprpriate authentication headers for Azure or Azurite table API
 *
 * @param {ITableEntityTestConfig} config
 * @param {*} headersOut
 * @param {string} baseUrl
 * @param {string} path
 * @param {*} headers
 * @return {*}
 */
function addAuthHeaders(
  config: ITableEntityTestConfig,
  headersOut: any,
  baseUrl: string,
  path: string,
  headers: any
) {
  if (config.testAzure) {
    const signingKey = Buffer.from(config.sharedKey, "base64");
    headersOut = addSharedKeyLiteAuthHeaderForAzure(
      baseUrl,
      path,
      headers,
      signingKey,
      config
    );
  } else {
    const signingKey = Buffer.from(config.sharedKey, "base64");
    headersOut = addSharedKeyLiteAuthHeaderForAzure(
      baseUrl,
      path,
      headers,
      signingKey,
      config
    );
  }
  return headersOut;
}

async function getReadableStreamBody(response: Response) {
  const output = await response.body;
  if (output === null) {
    throw new Error("Response body is null");
  }
  let outputString = "";
  const reader = output.getReader();
  let done = false;
  while (!done) {
    const { value, done: doneValue } = await reader.read();
    if (value) {
      outputString += new TextDecoder("utf-8").decode(value);
    }
    done = doneValue;
  }
  return outputString;
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
      config.testAzure,
      baseUrl,
      config.accountName,
      config.productionStyleHostName !== undefined ||
        config.productionStyleHostName !== ""
        ? `/${path}` // `/${path.replace(/'/g, "%27")}`
        : `/${config.accountName}/${path}` // `/${config.accountName}/${path.replace(/'/g, "%27")}`
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
  testAzure: boolean,
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
  // if we are running against Azurite, we need to use the account name
  // as the first part of the path
  canonicalizedResourceString += `/${account}${
    testAzure ? "" : "/devstoreaccount1"
  }${path}`;
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

/**
 * Currently builds a simple batch operation string for use in REST tests
 * later we can add more complex operations
 * or deform the request to test error handling
 *
 * @param {boolean} testAzure
 * @param {string} hostString
 * @param {string} tableName
 * @param {string} [verb="POST"]
 * @param {string} [entityJsonString='{"PartitionKey":"1", "RowKey":"1", "intValue":9, "stringValue":"foo"}']
 * @return {*}  {string}
 */
export function batchOperationStringBuilder(
  testAzure: boolean,
  hostString: string,
  tableName: string,
  verb: string = "POST",
  entityJsonString: string = '{"PartitionKey":"1", "RowKey":"1", "intValue":9, "stringValue":"foo"}'
): string {
  let getRequestPath = "";
  let entityJsonStringForBatch = entityJsonString;
  let entityRequestHeaders = "";
  if (verb === "GET") {
    getRequestPath = `${entityJsonString}`;
    entityJsonStringForBatch = "";
    entityRequestHeaders = "Accept: application/json;odata=minimalmetadata";
  } else if (verb == "PATCH") {
    const entityObject = JSON.parse(entityJsonString);
    getRequestPath = `(PartitionKey='${entityObject.PartitionKey}',RowKey='${entityObject.RowKey}')`;
    entityRequestHeaders =
      "Content-Type: application/json\r\nAccept: application/json;odata=minimalmetadata\r\nx-ms-version: 2020-12-06\r\nPrefer: return-no-content\r\nDataServiceVersion: 3.0;";
  } else {
    entityRequestHeaders =
      "Content-Type: application/json\r\nAccept: application/json;odata=minimalmetadata\r\nx-ms-version: 2020-12-06\r\nPrefer: return-no-content\r\nDataServiceVersion: 3.0;";
  }
  const batchOperationString = `Content-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\n${verb} ${hostString}/${
    testAzure ? "" : "devstoreaccount1/"
  }${tableName}${getRequestPath} HTTP/1.1\r\n${entityRequestHeaders}\r\n\r\n\r\n${entityJsonStringForBatch}`;

  return batchOperationString;
}

/**
 * Builds a batch request body for use in REST tests
 *
 * @param {string} hostString
 * @param {string} entityTestTableName
 * @param {string} batchBoundaryGuid
 * @return {*}
 */
export function batchBodyBuilder(
  hostString: string,
  entityTestTableName: string,
  batchBoundaryGuid: string,
  requestString: string
) {
  // create a new guid as a const for use as the changeset boundary
  // https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions
  const changesetBoundaryGuid = uuid.v4().toString();
  // return `--batch_${batchBoundaryGuid}\r\nContent-Type: multipart/mixed; boundary=changeset_${changesetBoundaryGuid}\r\n\r\n--changeset_${changesetBoundaryGuid}\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPATCH ${hostString}/${entityTestTableName}(PartitionKey=\'ad922e14-b371-4631-81ab-9e14e9c0e9ea\',RowKey=\'a\')?$format=application%2Fjson%3Bodata%3Dminimalmetadata HTTP/1.1\r\nHost: ${testConfig.host}\r\nx-ms-version: 2019-02-02\r\nDataServiceVersion: 3.0\r\nIf-Match: *\r\nAccept: application/json\r\nContent-Type: application/json\r\n\r\n{"PartitionKey":"ad922e14-b371-4631-81ab-9e14e9c0e9ea","RowKey":"a"}\r\n--changeset_${changesetBoundaryGuid}--\r\n\r\n--batch_${batchBoundaryGuid}--\r\n`;
  return `--batch_${batchBoundaryGuid}\r\ncontent-type: multipart/mixed; boundary=changeset_${changesetBoundaryGuid}\r\n\r\n\r\n--changeset_${changesetBoundaryGuid}\r\n${requestString}\r\n--changeset_${changesetBoundaryGuid}--\r\n--batch_${batchBoundaryGuid}--\r\n`;
}

/**
 * Builds a batch request body for use in REST tests
 *
 * @param {string} hostString
 * @param {string} entityTestTableName
 * @param {string} batchBoundaryGuid
 * @return {*}
 */
export function batchBodyBuilderForQuery(
  hostString: string,
  entityTestTableName: string,
  batchBoundaryGuid: string,
  requestString: string
) {
  // create a new guid as a const for use as the changeset boundary
  // https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions

  // return `--batch_${batchBoundaryGuid}\r\nContent-Type: multipart/mixed; boundary=changeset_${changesetBoundaryGuid}\r\n\r\n--changeset_${changesetBoundaryGuid}\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPATCH ${hostString}/${entityTestTableName}(PartitionKey=\'ad922e14-b371-4631-81ab-9e14e9c0e9ea\',RowKey=\'a\')?$format=application%2Fjson%3Bodata%3Dminimalmetadata HTTP/1.1\r\nHost: ${testConfig.host}\r\nx-ms-version: 2019-02-02\r\nDataServiceVersion: 3.0\r\nIf-Match: *\r\nAccept: application/json\r\nContent-Type: application/json\r\n\r\n{"PartitionKey":"ad922e14-b371-4631-81ab-9e14e9c0e9ea","RowKey":"a"}\r\n--changeset_${changesetBoundaryGuid}--\r\n\r\n--batch_${batchBoundaryGuid}--\r\n`;
  return `--batch_${batchBoundaryGuid}\r\n${requestString}\r\n--batch_${batchBoundaryGuid}--\r\n`;
}

/**
 * Creates a table for use in REST tests
 *
 * @param {string} entityTestTableName
 */
export async function createTableForREST(
  testConfig: ITableEntityTestConfig,
  entityTestHeaders: any,
  entityTestTableName: string,
  baseUrl: string
) {
  const body = JSON.stringify({
    TableName: entityTestTableName
  });
  const createTableResult: {
    status: string;
    statusText: string;
    body: string;
  } = await standardRestPost(
    baseUrl,
    "Tables",
    entityTestHeaders,
    body,
    testConfig
  );
  assert.strictEqual(
    createTableResult.status,
    201,
    `Unexpected status code when creating table ${entityTestTableName}, ${createTableResult.status}, "${createTableResult.statusText}", assuming we failed to create the table`
  );
}

/**
 * Creates a simple entity for use in REST tests
 *
 * @param {string} entityTestTableName
 * @param {string} [partitionKey="1"]
 * @param {string} [rowKey="1"]
 * @param {string} [value="foo"]
 */
export async function createSimpleEntityForREST(
  testConfig: ITableEntityTestConfig,
  entityTestHeaders: any,
  entityTestTableName: string,
  baseUrl: string,
  partitionKey: string = "1",
  rowKey: string = "1",
  value: string = "foo"
) {
  const body = JSON.stringify({
    PartitionKey: partitionKey,
    RowKey: rowKey,
    Value: value
  });
  const createEntityResult: {
    status: string;
    statusText: string;
    body: string;
  } = await standardRestPost(
    baseUrl,
    entityTestTableName,
    entityTestHeaders,
    body,
    testConfig
  );
  assert.strictEqual(
    createEntityResult.status,
    201,
    `Unexpected status code when creating entity ${entityTestTableName}, ${createEntityResult.status}, "${createEntityResult.statusText}", assuming we failed to create the table`
  );
}

/**
 * Retrieves a simple entity for use in REST tests
 * defaults to validating rowkey 1, partition key 1, and valueToCheck "foo"
 *
 * @param {string} entityTestTableName
 * @param {string} [partitionKey="1"]
 * @param {string} [rowKey="1"]
 * @param {string} [valueToCheck="foo"]
 */
export async function getSimpleEntityForREST(
  testConfig: ITableEntityTestConfig,
  entityTestHeaders: any,
  entityTestTableName: string,
  baseUrl: string,
  partitionKey: string = "1",
  rowKey: string = "1",
  valueToCheck: string = "foo"
) {
  const getEntityResult: {
    status: string;
    statusText: string;
    body: string;
  } = await standardRestGet(
    baseUrl,
    `${entityTestTableName}(PartitionKey='${partitionKey}',RowKey='${rowKey}')`,
    entityTestHeaders,
    testConfig
  );
  assert.strictEqual(
    getEntityResult.status,
    200,
    `Unexpected status code when fetching entity ${entityTestTableName}, ${getEntityResult.status}, "${getEntityResult.statusText}"`
  );

  const entity = JSON.parse(getEntityResult.body);
  assert.strictEqual(
    entity.Value,
    valueToCheck,
    `Unexpected value when fetching entity ${entityTestTableName}, entity value ${entity.Value} was not equal to "${valueToCheck}"`
  );
}

/**
 * Formats the host string for use in REST tests
 *
 * @param {ITableEntityTestConfig} testConfig
 * @return {*}  {string}
 */
export function formatHostString(testConfig: ITableEntityTestConfig): string {
  return `${testConfig.protocol === "https" ? "https" : "http"}://${
    testConfig.host
  }`;
}

/**
 * Generates the base URL for use in REST tests based on the test configuration
 * for use in node fetch requests
 */
export function generateBaseUrl(
  testConfig: ITableEntityTestConfig,
  productionStyle: boolean = false,
  useSecondary: boolean = false
): string {
  let host = "";
  if (productionStyle) {
    return `${testConfig.protocol === "https" ? "https" : "http"}://${
      useSecondary
        ? testConfig.productionStyleSecondaryHostName
        : testConfig.productionStyleHostName
    }:${testConfig.port}`;
  } else {
    host = `${testConfig.protocol === "https" ? "https" : "http"}://${
      testConfig.testAzure
        ? testConfig.host
        : `${testConfig.host}:${testConfig.port}/devstoreaccount1/`
    }`;
  }
  return host;
}

/**
 * Updates batch headers for use in REST tests
 *
 * @export
 * @param {*} headers
 * @param {*} additionalHeaders
 * @return {*}  {*}
 */
export function updateBatchHeaders(headers: any, additionalHeaders: any): any {
  let headersCopy = Object.assign({}, headers);

  for (const key in additionalHeaders) {
    if (additionalHeaders.hasOwnProperty(key)) {
      headersCopy[key] = additionalHeaders[key];
    }
  }
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headersCopy[key] = value;
  }
  headersCopy["x-ms-version"] = "2023-05-03"; // <- trying latest "2019-02-02";
  headersCopy["accept"] = "application/json";
  return headersCopy;
}
