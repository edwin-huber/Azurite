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
import { standardRestPost } from "../utils/RestRequestSubmitter";

// Set true to enable debug log
configLogger(false);

const testConfig: ITableEntityTestConfig = TableTestConfigFactory.create(true);

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
  it("Should be able to create a table, @loki", async () => {
    // first create the table for these tests
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      "x-ms-version": "2020-04-08",
      Accept: "application/json;odata=fullmetadata"
    };
    const createTableResult: {
      status: string;
      statusText: string;
      body: string;
    } = await standardRestPost(
      `${testConfig.protocol === "https" ? "https" : "http"}://${
        testConfig.host
      }`,
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
});
