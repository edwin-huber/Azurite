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
import dns = require("dns");
// Set true to enable debug log
configLogger(false);

const testConfig: ITableEntityTestConfig = TableTestConfigFactory.create(
  false,
  true
);

const createTableHeaders = {
  "Content-Type": "application/json",
  "x-ms-version": "2020-04-08",
  Accept: "application/json;odata=fullmetadata"
};

describe("table Entity APIs REST tests", () => {
  let server: TableServer;

  let reproFlowsTableName: string = getUniqueName("flows");

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
    reproFlowsTableName = getUniqueName("flows");
  });

  // https://github.com/Azure/Azurite/issues/754
  it.only("Should be able to create a table, @loki", async () => {
    // first create the table for these tests
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      201,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}", assuming we failed to create the table`
    );
  });

  it("should not create a table with non alphanumeric characters, @loki", async () => {
    const tableName = "this-should-not-work!";
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      400,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );
  });

  it("should not create a table starting with a numeric character, @loki", async () => {
    const tableName = "1" + getUniqueName("table");
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      400,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );
  });

  it("should not create a table name longer than 63 chars, @loki", async () => {
    const tableName = getUniqueName("table").padEnd(64, "a");
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      400,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );
  });

  it("should not create a table name less than 3 chars, @loki", async () => {
    const tableName = "ab";
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      400,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );
  });

  it("should not create a table name called tables, @loki", async () => {
    const tableName = "tables";
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      400,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );
  });

  it("should not create a table differing only in case to another table, @loki", async () => {
    const tableName = getUniqueName("table").toLowerCase();
    const body = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      201,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );

    const tableName2 = tableName.toUpperCase();
    const body2 = JSON.stringify({
      TableName: tableName2
    });
    const createTableResult2: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body2,
      testConfig
    );
    assert.strictEqual(
      createTableResult2.status,
      409,
      `Unexpected status code ${createTableResult2.status}, "${createTableResult2.statusText}"`
    );
  });

  it("should create a table with a name which is a substring of an existing table, @loki", async () => {
    // this will be used for 3 table names
    // [ a + b ], [ a ], [ b ]
    const a = getUniqueName("t");
    const b = getUniqueName("t");
    const tableName = a + b;
    const body1 = JSON.stringify({
      TableName: tableName
    });

    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body1,
      testConfig
    );
    assert.strictEqual(
      createTableResult.status,
      201,
      `Unexpected status code ${createTableResult.status}, "${createTableResult.statusText}"`
    );

    const body2 = JSON.stringify({
      TableName: a
    });

    const createTableResult2: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body2,
      testConfig
    );
    assert.strictEqual(
      createTableResult2.status,
      201,
      `Unexpected status code with end trimmed ${createTableResult2.status}, "${createTableResult2.statusText}"`
    );
    const body3 = JSON.stringify({
      TableName: b
    });

    const createTableResult3: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      formatHostString(),
      "Tables",
      createTableHeaders,
      body3,
      testConfig
    );
    assert.strictEqual(
      createTableResult3.status,
      201,
      `Unexpected status code with start trimmed ${createTableResult3.status}, "${createTableResult3.statusText}"`
    );
  });

  it(`Should be able to create a table with production style URL when ${testConfig.productionStyleHostName} is resolvable`, async () => {
    if (!testConfig.testAzure) {
      await dns.promises
        .lookup(testConfig.productionStyleHostName)
        .then(
          async (lookupAddress) => {
            if (lookupAddress.address !== null) {
              let tableName = getUniqueName("table");
              const body = JSON.stringify({
                TableName: tableName
              });

              try {
                const prodUrlResult: {
                  status: string;
                  statusText: string;
                  body: string;
                } = await standardRestPost(
                  formatProdHostString(),
                  "Tables",
                  createTableHeaders,
                  body,
                  testConfig
                );
                assert.strictEqual(prodUrlResult.status, 201);
              } catch (err: any) {
                assert.fail();
              }
            } else {
              assert.ok(
                true,
                `Skipping test case - it needs ${testConfig.productionStyleHostName} to be resolvable`
              );
            }
          },
          () => {
            // Cannot perform this test. We need devstoreaccount1-secondary.blob.localhost to resolve to 127.0.0.1.
            // On Linux, this should just work,
            // On Windows, we can't spoof DNS record for specific process.
            // So we have options of running our own DNS server (overkill),
            // or editing hosts files (machine global operation; and requires running as admin).
            // So skip the test case.
            assert.ok(
              `Skipping test case - it needs ${testConfig.productionStyleHostName} to be resolvable`
            );
          }
        )
        .catch((err) => {
          assert.fail(err.message);
        });
    }
  });

  it(`Should work with production style URL when ${testConfig.productionStyleSecondaryHostName} is resolvable`, async () => {
    if (!testConfig.testAzure) {
      await dns.promises
        .lookup(testConfig.productionStyleSecondaryHostName)
        .then(
          async (lookupAddress) => {
            // we need a null check in case someone messes up the config
            if (lookupAddress.address !== null) {
              let tableName = getUniqueName("table");
              const body = JSON.stringify({
                TableName: tableName
              });
              const createTableHeaders = {
                "Content-Type": "application/json",
                Accept: "application/json;odata=nometadata"
              };
              try {
                const prodSecUrlResult: {
                  status: string;
                  statusText: string;
                  body: string;
                } = await standardRestPost(
                  formatProdHostString(),
                  "Tables",
                  createTableHeaders,
                  body,
                  testConfig
                );
                assert.strictEqual(prodSecUrlResult.status, 201);

                let tablesList = await standardRestGet(
                  testConfig.productionStyleSecondaryHostName,
                  "Tables",
                  createTableHeaders,
                  testConfig
                );
                assert.strictEqual(tablesList.status, 200);
              } catch (err: any) {
                assert.fail();
              }
            } else {
              assert.ok(
                true,
                `Skipping test case - it needs ${testConfig.productionStyleSecondaryHostName} to be resolvable`
              );
            }
          },
          () => {
            // Cannot perform this test. We need devstoreaccount1-secondary.blob.localhost to resolve to 127.0.0.1.
            // On Linux, this should just work,
            // On Windows, we can't spoof DNS record for specific process.
            // So we have options of running our own DNS server (overkill),
            // or editing hosts files (machine global operation; and requires running as admin).
            // So skip the test case.
            assert.ok(
              `Skipping test case - it needs ${testConfig.productionStyleSecondaryHostName} to be resolvable`
            );
          }
        );
    }
  });
});

function formatHostString(): string {
  return `${testConfig.protocol === "https" ? "https" : "http"}://${
    testConfig.host
  }`;
}

function formatProdHostString(): string {
  return `${testConfig.protocol === "https" ? "https" : "http"}://${
    testConfig.productionStyleHostName
  }`;
}
