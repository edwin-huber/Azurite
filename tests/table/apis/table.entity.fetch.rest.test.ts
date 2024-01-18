// Tests in this file are using raw rest requests,
// as this enables us to test calls which are otherwise not possible
// using the SDKs, can be used as a test rig for repros which provide a debug log.
// later we can automate the parsing of repro logs to automatically play these into the tester
// special care is needed to replace etags and folders when used

import * as assert from "assert";
import { configLogger } from "../../../src/common/Logger";
import TableServer from "../../../src/table/TableServer";
import { getUniqueName } from "../../testutils";
import TableTestServerFactory from "../utils/TableTestServerFactory";
import TableTestConfigFactory, {
  ITableEntityTestConfig
} from "../utils/TableTestConfigFactory";
import {
  standardRestGet,
  standardRestPost
} from "../utils/RestRequestSubmitter";

// Set true to enable debug log
configLogger(false);

const testConfig: ITableEntityTestConfig = TableTestConfigFactory.create(true);

const entityTestHeaders = {
  "Content-Type": "application/json",
  "x-ms-version": "2020-04-08",
  dataServiceVersion: "3.0",
  MaxDataServiceVersion: "3.0;NetFx",
  Accept: "application/json;odata=fullmetadata"
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
    // in order to run tests without cleaning up, I am replacing the table name with a unique name each time
    entityTestTableName = getUniqueName("entityfetch");
  });

  // this validates the 2 functions used to create the basis for other tests
  it("Should be able to create a table and an entity, @loki", async () => {
    await createTableForREST(entityTestTableName);
    await createSimpleEntityForREST(entityTestTableName);
    await getSimpleEntityForREST(entityTestTableName);
  });

  it("Should be able to use patch verb in a batch request, @loki", async () => {
    await createTableForREST(entityTestTableName);
    const hostString = formatHostString();

    const batchWithPatchRequestString = `--batch_a10acba3-03e0-4200-b4da-a0cd4f0017f6\r\nContent-Type: multipart/mixed; boundary=changeset_0d221006-845a-4c28-a176-dfc18410d0e4\r\n\r\n--changeset_0d221006-845a-4c28-a176-dfc18410d0e4\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPATCH ${hostString}/${entityTestTableName}(PartitionKey=\'ad922e14-b371-4631-81ab-9e14e9c0e9ea\',RowKey=\'a\')?$format=application%2Fjson%3Bodata%3Dminimalmetadata HTTP/1.1\r\nHost: ${testConfig.host}\r\nx-ms-version: 2019-02-02\r\nDataServiceVersion: 3.0\r\nIf-Match: *\r\nAccept: application/json\r\nContent-Type: application/json\r\n\r\n{"PartitionKey":"ad922e14-b371-4631-81ab-9e14e9c0e9ea","RowKey":"a"}\r\n--changeset_0d221006-845a-4c28-a176-dfc18410d0e4--\r\n\r\n--batch_a10acba3-03e0-4200-b4da-a0cd4f0017f6--\r\n`;

    const additionalHeaders = {
      multipartContentType:
        "multipart/mixed; boundary=batch_a10acba3-03e0-4200-b4da-a0cd4f0017f6",
      requestId: "b685e1e7-6c7e-4c0b-8d1d-5d8e4a1a1b8c"
    };

    const batchHeaders = updateBatchHeaders(
      entityTestHeaders,
      additionalHeaders
    );

    const patchRequestResult = await standardRestPost(
      hostString,
      `$batch`,
      batchHeaders,
      batchWithPatchRequestString,
      testConfig
    );

    assert.strictEqual(patchRequestResult.status, 202);
    // we expect this to fail, as our batch request specifies the etag
    // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    const weMerged = patchRequestResult.data.match(
      "HTTP/1.1 404 Not Found"
    ).length;
    assert.strictEqual(weMerged, 1);
  });
});

/**
 * Creates a table for use in REST tests
 *
 * @param {string} entityTestTableName
 */
async function createTableForREST(entityTestTableName: string) {
  const body = JSON.stringify({
    TableName: entityTestTableName
  });

  const createTableResult: {
    status: string;
    statusText: string;
    body: string;
  } = await standardRestPost(
    `${testConfig.protocol === "https" ? "https" : "http"}://${
      testConfig.host
    }`,
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
async function createSimpleEntityForREST(
  entityTestTableName: string,
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
    `${testConfig.protocol === "https" ? "https" : "http"}://${
      testConfig.host
    }`,
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

async function getSimpleEntityForREST(
  entityTestTableName: string,
  partitionKey: string = "1",
  rowKey: string = "1",
  valueToCheck: string = "foo"
) {
  const getEntityResult: {
    status: string;
    statusText: string;
    body: string;
  } = await standardRestGet(
    `${testConfig.protocol === "https" ? "https" : "http"}://${
      testConfig.host
    }`,
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

function formatHostString(): string {
  return `${testConfig.protocol === "https" ? "https" : "http"}://${
    testConfig.host
  }`;
}

function updateBatchHeaders(headers: any, additionalHeaders: any): any {
  let headersCopy = Object.assign({}, headers);

  for (const key in additionalHeaders) {
    if (additionalHeaders.hasOwnProperty(key)) {
      headersCopy[key] = additionalHeaders[key];
    }
  }
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headersCopy[key] = value;
  }

  return headersCopy;
}
