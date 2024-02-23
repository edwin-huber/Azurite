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
  standardRestGet,
  standardRestPatch,
  standardRestPost,
  updateHeaders
} from "../utils/RestRequestSubmitter";
import uuid from "uuid";

// create a .env file in the root of the poject (same level as the .npmignore file
// and call create(true) to run tests against Azure
// turn on second parameter to see debug logs
const testConfig: ITableEntityTestConfig = TableTestConfigFactory.create(
  false, // testAzure
  true // turn on debug logging
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
  it("01. Should be able to create a table and an entity, @loki", async () => {
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

  it("02. Should be able to use a simple batch request, @loki", async () => {
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

    const batchHeaders = updateHeaders(entityTestHeaders, additionalHeaders);

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

  it("03. Should be able to use patch verb in a batch request, @loki", async () => {
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

    const batchHeaders = updateHeaders(entityTestHeaders, additionalHeaders);

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

  it("04. Should be able to use query based on partition and row key in a batch request, @loki", async () => {
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

    const batchHeaders = updateHeaders(entityTestHeaders, additionalHeaders);

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

  it.only("05. Upsert with wrong etag should fail in batch request, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );

    // first create our default entity to overwrite
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

    // const upsertBatchRequest = `--batch_adc25243-680a-46d2-bf48-0c112b5e8079\r\nContent-Type: multipart/mixed; boundary=changeset_b616f3c3-99ac-4bf7-8053-94b423345207\r\n\r\n--changeset_b616f3c3-99ac-4bf7-8053-94b423345207\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPUT http://127.0.0.1:10002/devstoreaccount1/${entityTestTableName}(PartitionKey=\'1\',RowKey=\'1\')?$format=application%2Fjson%3Bodata%3Dminimalmetadata HTTP/1.1\r\nHost: 127.0.0.1\r\nx-ms-version: 2019-02-02\r\nDataServiceVersion: 3.0\r\nIf-Match: W/"datetime\'2022-02-23T07%3A21%3A33.9580000Z\'"\r\nAccept: application/json\r\nContent-Type: application/json\r\n\r\n{"PartitionKey":"1","RowKey":"1"}\r\n--changeset_b616f3c3-99ac-4bf7-8053-94b423345207--\r\n\r\n--batch_adc25243-680a-46d2-bf48-0c112b5e8079--\r\n`;
    // const upsertBatchHeaders = {
    //   "x-ms-version": "2019-02-02",
    //   options: {
    //     requestId: "38c433f9-5af4-4890-8082-d1380605ed8e",
    //     dataServiceVersion: "3.0"
    //   },
    //   "Content-Type":
    //     "multipart/mixed; boundary=batch_adc25243-680a-46d2-bf48-0c112b5e8079"
    // };
    // ###

    const hostString = formatHostString(testConfig);

    const batchBoundaryGuid = uuid.v4().toString();
    const badbatchHeader = `Host: ${hostString}\r\nx-ms-version: 2019-02-02\r\nDataServiceVersion: 3.0\r\nIf-Match: W/"datetime\'2022-02-23T07%3A21%3A33.9580000Z\'"\r\nAccept: application/json\r\nContent-Type: application/json`;
    const batchOperationString = batchOperationStringBuilder(
      testConfig.testAzure,
      hostString,
      entityTestTableName,
      "PUT",
      '{"PartitionKey":"1", "RowKey":"1", "intValue":9, "stringValue":"qux"}',
      badbatchHeader
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

    const batchHeaders = updateHeaders(entityTestHeaders, additionalHeaders);

    const upsertBatchResult = await standardRestPost(
      baseUrl,
      `$batch`,
      batchHeaders,
      batchWithPatchRequestString,
      testConfig
    );

    assert.strictEqual(upsertBatchResult.status, 202, "Batch Upsert Failed.");
    assert.strictEqual(
      upsertBatchResult.body.match(/\s412\sPrecondition\sFailed/)?.length,
      1,
      "Did not get the expected error in batch response."
    );
  });

  // validation based on:
  // https://docs.microsoft.com/en-us/rest/api/storageservices/Understanding-the-Table-Service-Data-Model#characters-disallowed-in-key-fields
  it("06. Should not accept invalid characters in partitionkey or rowKey, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );

    const invalidKeyRequests: string[] = [
      '{"PartitionKey":"doNotAllow/ForwardSlash","RowKey":"1","value":"val1"}',
      '{"PartitionKey":"1","RowKey":"doNotAllow/ForwardSlash","value":"val1"}',
      '{"PartitionKey":"doNotAllow#hash","RowKey":"1","value":"val1"}',
      '{"PartitionKey":"1","RowKey":"doNotAllow#hash","value":"val1"}',
      '{"PartitionKey":"doNotAllow?questionmark","RowKey":"1","value":"val1"}',
      '{"PartitionKey":"1","RowKey":"doNotAllow?questionmark","value":"val1"}',
      '{"PartitionKey":"doNotAllow\\backslash","RowKey":"1","value":"val1"}'
    ];
    // need to test u0000 to u001f and u007f to u009f
    for (let i = 0x0; i <= 0x1f; i++) {
      invalidKeyRequests.push(
        `{"PartitionKey":"doNotAllow-\\u${i
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}unicodecontrol","RowKey":"1","value":"val1"}`
      );
      invalidKeyRequests.push(
        `{"PartitionKey":"1","RowKey":"doNotAllow-\\u${i
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}unicodecontrol","value":"val1"}`
      );
    }
    for (let i = 0x007f; i <= 0x9f; i++) {
      invalidKeyRequests.push(
        `{"PartitionKey":"doNotAllow-\\u${i
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}unicodecontrol","RowKey":"1","value":"val1"}`
      );
      invalidKeyRequests.push(
        `{"PartitionKey":"1","RowKey":"doNotAllow-\\u${i
          .toString(16)
          .padStart(4, "0")
          .toUpperCase()}unicodecontrol","value":"val1"}`
      );
    }

    for (const invalidKeyRequest of invalidKeyRequests) {
      try {
        const queryRequestResult = await standardRestPost(
          baseUrl,
          entityTestTableName,
          entityTestHeaders,
          invalidKeyRequest,
          testConfig
        );

        assert.strictEqual(queryRequestResult.status, 400);
      } catch (err: any) {
        if (err.response !== undefined) {
          assert.strictEqual(
            err.response.status,
            400,
            `We did not get the expected status code, we got: ${err} for request ${invalidKeyRequest}`
          );
        }
      }
    }
  });

  it("07. Should fail to update using patch verb if entity does not exist, @loki", async () => {
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

    try {
      const patchRequestResult = await standardRestPatch(
        baseUrl,
        entityTestTableName,
        updateHeaders(entityTestHeaders, { "If-Match": "*" }),
        '{"PartitionKey":"2","RowKey":"1"}',
        testConfig,
        "(PartitionKey='2',RowKey='1')"
      );

      assert.strictEqual(
        patchRequestResult.status,
        404,
        "Patch request did not fail with 404."
      );
      // we expect this to fail, as our batch request specifies the etag
      // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    } catch (err: any) {
      assert.strictEqual(err.actual, 404, err.message);
    }
  });

  // https://github.com/Azure/Azurite/issues/1428
  it("08. Should not receive any results when querying with filter and top = 0, @loki", async () => {
    const baseUrl = generateBaseUrl(testConfig);
    await createTableForREST(
      testConfig,
      entityTestHeaders,
      entityTestTableName,
      baseUrl
    );

    for (let i = 0; i < 10; i++) {
      await createSimpleEntityForREST(
        testConfig,
        entityTestHeaders,
        entityTestTableName,
        baseUrl,
        "1",
        i.toString(),
        i.toString()
      );
    }

    // this is the query from storage explorer based on the repro in the issue:
    // GET /devstoreaccount1/test01?%24select=&%24filter=PartitionKey%20eq%20%270%27&%24top=0 HTTP/1.1" 200 -
    await standardRestGet(
      baseUrl,
      entityTestTableName,
      entityTestHeaders,
      testConfig,
      "?$select=&$filter=PartitionKey%20eq%20%271%27&$top=0"
    )
      .catch((getErr) => {
        assert.strictEqual(
          getErr.response.status,
          200,
          "We should not error on query!"
        );
      })
      .then((response) => {
        if (response) {
          assert.strictEqual(
            response.status,
            200,
            `${response.status} was not expected status code for query!`
          );
        }
      });
  });
});
