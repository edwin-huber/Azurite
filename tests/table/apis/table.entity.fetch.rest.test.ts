// Tests in this file are using raw rest requests,
// as this enables us to test calls which are otherwise not possible
// using the SDKs, can be used as a test rig for repros which provide a debug log.
// later we can automate the parsing of repro logs to automatically play these into the tester
// special care is needed to replace etags and folders when used

import * as assert from "assert";
import TableServer from "../../../src/table/TableServer";
import { getUniqueName } from "../../testutils";
import TableTestServerFactory from "../utils/TableTestServerFactory";
import TableTestConfigFactory, {
  ITableEntityTestConfig
} from "../utils/TableTestConfigFactory";
import {
  batchBodyBuilder,
  batchBodyBuilderForQuery,
  batchOperationStringBuilder,
  createSimpleEntityForREST,
  createTableForREST,
  formatHostString,
  generateBaseUrl,
  getSimpleEntityForREST,
  standardRestPost,
  updateBatchHeaders
} from "../utils/RestRequestSubmitter";
import uuid from "uuid";

// create a .env file in the root of the poject (same level as the .npmignore file
// and call create(true) to run tests against Azure
// turn on second parameter to see debug logs
const testConfig: ITableEntityTestConfig = TableTestConfigFactory.create(
  false, // testAzure
  false // turn on debug logging
);

// We must include the x-ms-version header;
// the header's value must be set to 2009-04-14 or newer.
const entityTestHeaders = {
  "content-type": "application/json",
  "x-ms-version": "2020-12-06",
  dataserviceversion: "3.0",
  maxdataserviceversion: "3.0;NetFx",
  accept: "application/json;odata=fullmetadata"
};

describe("table Entity APIs REST tests", () => {
  let server: TableServer;

  let entityTestTableName: string = "";

  before(async () => {
    server = new TableTestServerFactory().createServer({
      metadataDBPath: "__tableTestsStorage__",
      enableDebugLog: testConfig.enableDebugLog,
      debugLogFilePath: testConfig.debugLogPath,
      loose: false,
      skipApiVersionCheck: true,
      https: testConfig.protocol === "https"
    });
    await server.start();
  });

  after(async () => {
    await server.close();
  });

  beforeEach(() => {
    // in order to run tests without cleaning up, we replace the table name with a unique name each time
    entityTestTableName = getUniqueName("entityfetch");
  });

  // this validates the 3 functions used as the basis for further tests
  it("Should be able to create a table and an entity, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await createSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await getSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
  });

  it("Should be able to use a simple batch request, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    const hostString = formatHostString(testConfig);

    const batchBoundaryGuid = uuid.v4().toString();
    const batchOperationString = batchOperationStringBuilder(
      testConfig.testAzure,
      hostString,
      entityTestTableName
    );

    const batchWithPUTRequestString = batchBodyBuilder(
      hostString,
      entityTestTableName,
      batchBoundaryGuid,
      batchOperationString
    );

    const additionalHeaders = {
      "content-type": `multipart/mixed; boundary=batch_${batchBoundaryGuid}`,
      requestId: uuid.v4().toString()
    };

    const batchHeaders = updateBatchHeaders(
      entityTestHeaders,
      additionalHeaders
    );

    const patchRequestResult = await standardRestPost(
      baseUrl,
      `$batch`,
      batchHeaders,
      batchWithPUTRequestString,
      testConfig
    );

    assert.strictEqual(patchRequestResult.status, 202);
    // we expect this to fail, as our batch request specifies the etag
    // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    const wePUT = patchRequestResult.body.match("HTTP/1.1 204").length;
    assert.strictEqual(wePUT, 1);
  });

  it("Should be able to use patch verb in a batch request, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await createSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await getSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    const hostString = formatHostString(testConfig);

    const batchBoundaryGuid = uuid.v4().toString();

    const batchOperationString = batchOperationStringBuilder(
      testConfig.testAzure,
      hostString,
      entityTestTableName,
      "PATCH"
    );
    const batchWithPatchRequestString = batchBodyBuilder(
      hostString,
      entityTestTableName,
      batchBoundaryGuid,
      batchOperationString
    );

    const additionalHeaders = {
      "content-type": `multipart/mixed; boundary=batch_${batchBoundaryGuid}`,
      requestId: uuid.v4().toString()
    };

    const batchHeaders = updateBatchHeaders(
      entityTestHeaders,
      additionalHeaders
    );

    const patchRequestResult = await standardRestPost(
      baseUrl,
      `$batch`,
      batchHeaders,
      batchWithPatchRequestString,
      testConfig
    );

    assert.strictEqual(patchRequestResult.status, 202);
    // we expect this to fail, as our batch request specifies the etag
    // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    // however we now see that the batch request is failing with a 405
    // method not allowed => needs (PartitionKey='pk',RowKey='rk1') in the url
    const patchResult = patchRequestResult.body.match("204 No Content");
    assert.strictEqual(
      patchResult?.index > 1,
      true,
      "We did not get the expected result of our batch request."
    );
  });

  it("Should be able to use query based on partition and row key in a batch request, @loki", async () => {
    // create an check that entity exists
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await createSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );
    await getSimpleEntityForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );

    const hostString = formatHostString(testConfig);
    // now query the entity in a batch request

    const batchBoundaryGuid = uuid.v4().toString();
    // for simple get requests, the body is empty, and we use the query in the url
    const batchOperationString = batchOperationStringBuilder(
      testConfig.testAzure,
      hostString,
      entityTestTableName,
      "GET",
      "(PartitionKey='1',RowKey='1')"
    );

    const batchWithGETRequestString = batchBodyBuilderForQuery(
      hostString,
      entityTestTableName,
      batchBoundaryGuid,
      batchOperationString
    );

    const additionalHeaders = {
      "content-type": `multipart/mixed; boundary=batch_${batchBoundaryGuid}`,
      requestId: uuid.v4().toString()
    };

    const batchHeaders = updateBatchHeaders(
      entityTestHeaders,
      additionalHeaders
    );

    const batchGetRequestResult = await standardRestPost(
      baseUrl,
      `$batch`,
      batchHeaders,
      batchWithGETRequestString,
      testConfig
    );

    assert.strictEqual(batchGetRequestResult.status, 202);
    // we expect this to fail, as our batch request specifies the etag
    // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    const weGot = batchGetRequestResult.body.match('"RowKey":"1"')?.length;
    assert.strictEqual(weGot, 1);
  });
});
