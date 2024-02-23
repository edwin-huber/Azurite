// Tests in this file are using raw rest requests,
// as this enables us to test calls which are otherwise not possible
// using the SDKs, can be used as a test rig for repros which provide a debug log.
// later we can automate the parsing of repro logs to automatically play these into the tester
// special care is needed to replace etags and folders when used

import * as assert from "assert";
import { AxiosResponse } from "axios";
import { configLogger } from "../../../src/common/Logger";
import TableServer from "../../../src/table/TableServer";
import { getUniqueName } from "../../testutils";
import { createUniquePartitionKey } from "../utils/table.entity.test.utils";
import {
  getToAzurite,
  mergeToAzurite,
  // mergeToAzurite,
  patchToAzurite,
  postToAzurite,
  putToAzurite
} from "../utils/table.entity.tests.rest.submitter";
import TableTestServerFactory from "../utils/TableTestServerFactory";
import TableTestConfigFactory, {
  ITableEntityTestConfig
} from "../utils/TableTestConfigFactory";

// Set true to enable debug log
configLogger(false);

const testConfig = TableTestConfigFactory.create(false, false);

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
  it("Should be able to create a table using axios rest client and await, @loki", async () => {
    // first create the table for these tests
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };
    const createTableResult = await postToAzurite(
      "Tables",
      body,
      createTableHeaders,
      testConfig
    );
    assert.strictEqual(createTableResult.status, 201);

    // prettier-ignore
    const batchRequest1RawRequestString: string = `--batch_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7\r\nContent-Type: multipart/mixed; boundary=changeset_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7\r\n\r\n--changeset_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName} HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nPrefer: return-no-content\r\n\r\n{\"PartitionKey\":\"09CEE\",\"RowKey\":\"EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A\",\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:46.5446473Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:46.5535366Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"127b472c-6db3-4de7-bdb7-4947314e77c0\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786989753914\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:46.5430732Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName} HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nPrefer: return-no-content\r\n\r\n{\"PartitionKey\":\"09CEE\",\"RowKey\":\"EA5F528CF1B84658A5CECC574848547B_FLOWVERSION-5539F65E020B44FCA32CF9CBE56E286A-08585830786989753914\",\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:46.5446473Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:46.5535366Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"127b472c-6db3-4de7-bdb7-4947314e77c0\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786989753914\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:46.5430732Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName} HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nPrefer: return-no-content\r\n\r\n{\"PartitionKey\":\"09CEE\",\"RowKey\":\"EA5F528CF1B84658A5CECC574848547B_FLOWLOOKUP-DE415C09:2D29BB:2D483D:2D9544:2D25602C1FF355-TESTFLOW1\",\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:46.5446473Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:46.5535366Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"127b472c-6db3-4de7-bdb7-4947314e77c0\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786989753914\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:46.5430732Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7--\r\n--batch_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7--\r\n`;
    const batchRequest1Headers = {
      "user-agent": "ResourceStack/6.0.0.1260",
      "x-ms-version": "2018-03-28",
      "x-ms-client-request-id": "127b472c-6db3-4de7-bdb7-4947314e77c0",
      accept: "application/json;odata=nometadata",
      "content-type":
        "multipart/mixed; boundary=batch_4689afd3-e4e1-4966-9aeb-2bdb8d16cba7"
    };
    const request1Result = await postToAzurite(
      "$batch",
      batchRequest1RawRequestString,
      batchRequest1Headers,
      testConfig
    );
    // we submitted the batch OK
    assert.strictEqual(request1Result.status, 202);

    const request2Result = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "7bbeb6b2-a1c7-4fed-8a3c-80f6b3e7db8c",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(request2Result.status, 200);

    const request3Result = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "41eb727e-1f85-4f53-b4e1-2df2628b2903",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(request3Result.status, 200);

    // prettier-ignore
    const batchRequest2RawRequestString: string = `--batch_3e8c6583-146e-4326-835f-5f7321fc6711\r\nContent-Type: multipart/mixed; boundary=changeset_3e8c6583-146e-4326-835f-5f7321fc6711\r\n\r\n--changeset_3e8c6583-146e-4326-835f-5f7321fc6711\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName} HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nPrefer: return-no-content\r\n\r\n{\"PartitionKey\":\"09CEE\",\"RowKey\":\"EA5F528CF1B84658A5CECC574848547B_FLOWVERSION-5539F65E020B44FCA32CF9CBE56E286A-08585830786980800821\",\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:47.4209193Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:47.4214726Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"f2503371-15c7-4314-9803-81ea69f1ca72\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786980800821\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:47.4101988Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_3e8c6583-146e-4326-835f-5f7321fc6711\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPUT http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A') HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nIf-Match: W/\"datetime'2021-04-15T23%3A09%3A46.5910000Z'\"\r\n\r\n{\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:46.5446473Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:47.4214726Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"f2503371-15c7-4314-9803-81ea69f1ca72\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786980800821\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:47.4101988Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_3e8c6583-146e-4326-835f-5f7321fc6711\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPUT http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWLOOKUP-DE415C09%3A2D29BB%3A2D483D%3A2D9544%3A2D25602C1FF355-TESTFLOW1') HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nIf-Match: W/\"datetime'2021-04-15T23%3A09%3A46.5910000Z'\"\r\n\r\n{\"Sku\":\"{\\\"name\\\":\\\"Standard\\\",\\\"plan\\\":{\\\"name\\\":\\\"farm0\\\",\\\"id\\\":\\\"/subscriptions/ea5f528c-f1b8-4658-a5ce-cc574848547b/resourcegroups/rgname/providers/microsoft.web/serverfarms/farm0\\\",\\\"type\\\":\\\"Microsoft.Web/ServerFarms\\\"}}\",\"State\":\"Enabled\",\"CreatedTime\":\"2021-04-15T23:09:46.5446473Z\",\"CreatedTime@odata.type\":\"Edm.DateTime\",\"ChangedTime\":\"2021-04-15T23:09:47.4214726Z\",\"ChangedTime@odata.type\":\"Edm.DateTime\",\"DeletedTime\":\"1970-01-01T00:00:00Z\",\"DeletedTime@odata.type\":\"Edm.DateTime\",\"ChangedOperationId\":\"f2503371-15c7-4314-9803-81ea69f1ca72\",\"FlowId\":\"5539f65e020b44fca32cf9cbe56e286a\",\"SubscriptionId\":\"ea5f528c-f1b8-4658-a5ce-cc574848547b\",\"ResourceGroupName\":\"de415c09-29bb-483d-9544-25602c1ff355\",\"FlowName\":\"testflow1\",\"FlowSequenceId\":\"08585830786980800821\",\"ScaleUnit\":\"CU03\",\"Location\":\"devfabric\",\"RuntimeConfiguration\":\"{}\",\"DefinitionCompressed\":\"jwcotS/9AEgVAwCiRhYYkLcNkP8mJJYMoNGjbJnZPa29JAj6mJmxrTE9/2R9ohB1/NkjGtPz5ue0veuIO/Bh4F5oChYGDVOK3MToeBoFf7AtSEKrwCZGxxFRXsjU9Y9ObxOj44BjAQEAHmQzCg==\",\"DefinitionCompressed@odata.type\":\"Edm.Binary\",\"Metadata\":\"F3t9\",\"Metadata@odata.type\":\"Edm.Binary\",\"ParametersCompressed\":\"F3t9\",\"ParametersCompressed@odata.type\":\"Edm.Binary\",\"ConnectionReferences\":\"F3t9\",\"ConnectionReferences@odata.type\":\"Edm.Binary\",\"WorkflowReferences\":\"F3t9\",\"WorkflowReferences@odata.type\":\"Edm.Binary\",\"KeyVaultCertificateReferences\":\"F3t9\",\"KeyVaultCertificateReferences@odata.type\":\"Edm.Binary\",\"RuntimeContext\":\"9wwotS/9AEjlAwByiBkYkMU5BL8arW5Jf8FNkkBfmOlff9ZsdxcWrTF0mx+8MGnqWiyshMHAwMidxtAJrOk2bmWAjRV8Ta7rVnzgkVCFZ7LZJJFlmzuNoTuuSiEhqMI7jaHb/GBF15nC6V6cLr66kv9NxwIGAL9DUfY8vlXeBHXArwqTKlQZ\",\"RuntimeContext@odata.type\":\"Edm.Binary\",\"FlowUpdatedTime\":\"2021-04-15T23:09:47.4101988Z\",\"FlowUpdatedTime@odata.type\":\"Edm.DateTime\"}\r\n--changeset_3e8c6583-146e-4326-835f-5f7321fc6711--\r\n--batch_3e8c6583-146e-4326-835f-5f7321fc6711--\r\n`;

    const request4Result = await postToAzurite(
      `$batch`,
      batchRequest2RawRequestString,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "f2503371-15c7-4314-9803-81ea69f1ca72",
        accept: "application/json;odata=nometadata",
        "content-type":
          "multipart/mixed; boundary=batch_3e8c6583-146e-4326-835f-5f7321fc6711"
      },
      testConfig
    );
    // we submitted the batch OK
    assert.strictEqual(request4Result.status, 202);

    const request5Result = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "ceceedd3-4d7c-450f-a738-b83b21788d42",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(request5Result.status, 200);

    const request6Result = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "ceceedd3-4d7c-450f-a738-b83b21788d42",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(request6Result.status, 200);
    const result6Data: any = request6Result.data;
    // prettier-ignore
    const flowEtag: string = result6Data["odata.etag"];

    // we need to look up EA5F528CF1B84658A5CECC574848547B_FLOWLOOKUP-DE415C09%3A2D29BB%3A2D483D%3A2D9544%3A2D25602C1FF355-TESTFLOW1
    // as this etag is also used with the delete in the failing batch request
    const requestTestFlowResult = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWLOOKUP-DE415C09%3A2D29BB%3A2D483D%3A2D9544%3A2D25602C1FF355-TESTFLOW1')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "00000000-4d7c-450f-a738-b83b21788d42",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(requestTestFlowResult.status, 200);
    const resultTestFlowData: any = request6Result.data;
    // prettier-ignore
    const testFlowEtag: string = resultTestFlowData["odata.etag"];

    // validate the etag that we are using to delete the flow
    const validateEtagResult = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "00000001-4d7c-450f-a738-b83b21788d42",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    );
    assert.strictEqual(request6Result.status, 200);
    const validateEtagResultData: any = validateEtagResult.data;
    // prettier-ignore
    const flowEtagValid: string = validateEtagResultData["odata.etag"];

    assert.strictEqual(
      flowEtag,
      flowEtagValid,
      "The Etag from the batch request and the etag we have in storage do not match!"
    );

    // we need to replace the if-match / etag with the one from request6
    // prettier-ignore
    const batchRequest3RawRequestString: string = `--batch_558d985f-491c-496d-b4a2-311c3e1e075d\r\nContent-Type: multipart/mixed; boundary=changeset_558d985f-491c-496d-b4a2-311c3e1e075d\r\n\r\n--changeset_558d985f-491c-496d-b4a2-311c3e1e075d\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nDELETE http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A') HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nIf-Match: ${flowEtag}\r\n\r\n--changeset_558d985f-491c-496d-b4a2-311c3e1e075d\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nDELETE http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWLOOKUP-DE415C09%3A2D29BB%3A2D483D%3A2D9544%3A2D25602C1FF355-TESTFLOW1') HTTP/1.1\r\nAccept: application/json;odata=nometadata\r\nContent-Type: application/json\r\nIf-Match: ${testFlowEtag}\r\n\r\n--changeset_558d985f-491c-496d-b4a2-311c3e1e075d--\r\n--batch_558d985f-491c-496d-b4a2-311c3e1e075d--\r\n`;

    const request7Result = await postToAzurite(
      `$batch`,
      batchRequest3RawRequestString,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "41aef06f-9443-497e-b192-216ae988549b",
        "content-type":
          "multipart/mixed; boundary=batch_558d985f-491c-496d-b4a2-311c3e1e075d",
        accept: "application/json;odata=nometadata"
      },
      testConfig
    );
    // we submitted the batch OK
    // current repro fails with precondition failed
    assert.strictEqual(request7Result.status, 202);

    // validate the object was deleted!
    await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='09CEE',RowKey='EA5F528CF1B84658A5CECC574848547B_FLOWIDENTIFIER-5539F65E020B44FCA32CF9CBE56E286A')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "00000002-4d7c-450f-a738-b83b21788d42",
        accept: "application/json;odata=minimalmetadata"
      },
      testConfig
    ).catch((getErr) => {
      assert.strictEqual(getErr.response.status, 404);
    });
  });

  /**
   * Check that ifmatch * update works...
   * if etag == *, then tableClient.updateEntity is calling "Merge" via PATCH with merge option.
   * Same if etag is omitted. Patch usage is not documented.
   * if Replace option, calling "Update" in the table handler, which is caling insertOrUpdate in metadata
   *
   * Test If-Match cases
   * https://docs.microsoft.com/en-us/rest/api/storageservices/update-entity2
   * Update Entity: If-Match Required, via PUT
   * https://docs.microsoft.com/en-us/rest/api/storageservices/insert-or-replace-entity
   * Insert or Replace: no If-Match, via PUT
   * https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
   * Merge-Entity: If-Match Required, via MERGE
   * https://docs.microsoft.com/en-us/rest/api/storageservices/insert-or-merge-entity
   * Insert or Merge: no  If-Match, via MERGE
   */
  it("Should check different merge, update and replace scenarios on existing entity using if-match", async () => {
    const mergeTable = getUniqueName("ifmatch");
    const body = JSON.stringify({
      TableName: mergeTable
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };
    const createTableResult = await postToAzurite(
      "Tables",
      body,
      createTableHeaders,
      testConfig
    );
    assert.strictEqual(createTableResult.status, 201);

    let oldEtag = "";
    let newEtag = "";

    const testHeaders = {
      "Content-Type": "application/json",
      version: "",
      "x-ms-client-request-id": "1",
      DataServiceVersion: "3"
    };
    // First create entity for updating PUT without etag
    try {
      const firstPutRequestResult = await putToAzurite(
        `${mergeTable}(PartitionKey='9b0afb2e-3be7-4b95-9ce1-45e9a410cc19',RowKey='a')`,
        '{"PartitionKey":"9b0afb2e-3be7-4b95-9ce1-45e9a410cc19","RowKey":"a", "stringValue":"blank"}',
        testHeaders,
        testConfig
      );
      assert.strictEqual(firstPutRequestResult.status, 204);
      oldEtag = firstPutRequestResult.headers.etag;
    } catch (err: any) {
      assert.notStrictEqual(
        err.response,
        undefined,
        "Axios error response state invalid"
      );
      assert.strictEqual(
        err.response.status,
        404,
        "We did not get the expected failure."
      );
    }

    const testCases: IfMatchTestCase[] = [
      {
        name: "case 1: Update Entity : PUT with * If-Match.",
        body: "case1",
        useIfMatch: true,
        ifMatch: "*",
        restFunction: putToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage: "We should not fail PUT with with * If-Match"
      },
      {
        name: "case 2 : Update Entity : PUT with old etag in If-Match.",
        body: "case2",
        useIfMatch: true,
        ifMatch: oldEtag,
        restFunction: putToAzurite,
        expectedStatus: 412,
        expectSuccess: false,
        errorMessage: "We should not succeed Update PUT using the oldEtag."
      },
      {
        name: "case 3 : Update Entity : PUT with most recent etag in If-Match.",
        body: "case3",
        useIfMatch: true,
        ifMatch: "new",
        restFunction: putToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage: `We should not fail with the new etag.`
      },
      {
        name: "case 4 : Insert or Replace Entity: PUT without If-Match.",
        body: "case4",
        useIfMatch: false,
        ifMatch: "",
        restFunction: putToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage: "We did expected PUT without if-match to succeed."
      },
      {
        name: "case 5 : Update Entity : PATCH with * If-Match",
        body: "case5",
        useIfMatch: true,
        ifMatch: "*",
        restFunction: patchToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage: "We did expected PATCH with * if-match to fail."
      },
      {
        name: "case 6 : Update Entity : PATCH with old etag in If-Match",
        body: "case6",
        useIfMatch: true,
        ifMatch: oldEtag,
        restFunction: patchToAzurite,
        expectedStatus: 412,
        expectSuccess: false,
        errorMessage:
          "We did not get the expected failure patching with old etag."
      },
      {
        name: "case 7 : Update Entity : PATCH with new etag in If-Match",
        body: "case7",
        useIfMatch: true,
        ifMatch: "new",
        restFunction: patchToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage:
          "We did not get the expected success patching with most recent etag."
      },
      {
        name: "case 8 : Insert or Replace Entity : PATCH with no If-Match",
        body: "case8",
        useIfMatch: false,
        ifMatch: "",
        restFunction: patchToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage:
          "We did not get the expected success patching without if-match."
      },
      {
        name: "case 9 : Merge Entity : MERGE with If-Match as *",
        body: "case9",
        useIfMatch: true,
        ifMatch: "*",
        restFunction: mergeToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage:
          "We did not get the expected success merging with * if-match."
      },
      {
        name: "case 10 : Merge Entity : MERGE with If-Match as old etag",
        body: "case10",
        useIfMatch: true,
        ifMatch: oldEtag,
        restFunction: mergeToAzurite,
        expectedStatus: 412,
        expectSuccess: false,
        errorMessage:
          "We did not get the expected failure merging with old if-match."
      },
      {
        name: "case 11 : Merge Entity : MERGE with If-Match as most recent etag",
        body: "case11",
        useIfMatch: true,
        ifMatch: "new",
        restFunction: mergeToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage:
          "We did not get the expected success merging with most recent etag in if-match."
      },
      {
        name: "case 12 : Insert or Merge Entity : MERGE with no If-Match",
        body: "case12",
        useIfMatch: false,
        ifMatch: "",
        restFunction: mergeToAzurite,
        expectedStatus: 204,
        expectSuccess: true,
        errorMessage:
          "We did not get the expected success merging with no if-match."
      }
    ];

    for (const testCase of testCases) {
      try {
        const headers = createHeadersForIfMatchTest(
          testCase,
          getHeadersForIfMatchTest(),
          newEtag
        );
        const testCaseRequestResult = await testCase.restFunction(
          `${mergeTable}(PartitionKey='9b0afb2e-3be7-4b95-9ce1-45e9a410cc19',RowKey='a')`,
          `{"PartitionKey":"9b0afb2e-3be7-4b95-9ce1-45e9a410cc19","RowKey":"a","stringValue":"${testCase.body}"}`,
          headers,
          testConfig
        );
        assert.strictEqual(
          testCaseRequestResult.status,
          testCase.expectedStatus,
          testCase.errorMessage
        );
        if (testCase.expectSuccess) {
          newEtag = testCaseRequestResult.headers.etag;
        }
      } catch (err: any) {
        assert.notStrictEqual(
          err.response,
          undefined,
          `Axios error ${err} response state invalid for ${testCase.name}`
        );
        assert.strictEqual(
          err.response.status,
          testCase.expectedStatus,
          testCase.errorMessage
        );
        assert.strictEqual(
          false,
          testCase.expectSuccess,
          testCase.errorMessage
        );
      }
    }
  });

  // issue 1579
  it("Should return etag when querying an entity, @loki", async () => {
    // create test table
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };

    // post table to Azurite
    const createTableResult = await postToAzurite(
      "Tables",
      body,
      createTableHeaders,
      testConfig
    );

    // check if successfully created
    assert.strictEqual(createTableResult.status, 201);

    const createEntityHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };

    const partitionKey = createUniquePartitionKey();
    const rowKey = "RK";

    // post to Azurite
    const createEntityResult = await postToAzurite(
      reproFlowsTableName,
      `{"PartitionKey":"${partitionKey}","RowKey":"${rowKey}","Value":"01"}`,
      createEntityHeaders,
      testConfig
    );
    // check if successfully added
    assert.strictEqual(createEntityResult.status, 201);

    // get from Azurite; set odata=nometadata
    const request2Result = await getToAzurite(
      `${reproFlowsTableName}(PartitionKey='${partitionKey}',RowKey='${rowKey}')`,
      {
        "user-agent": "ResourceStack/6.0.0.1260",
        "x-ms-version": "2018-03-28",
        "x-ms-client-request-id": "7bbeb6b2-a1c7-4fed-8a3c-80f6b3e7db8c",
        accept: "application/json;odata=nometadata"
      },
      testConfig
    );
    // check if successfully returned
    assert.strictEqual(request2Result.status, 200);
    // check headers
    const result2Data: any = request2Result.headers;
    // look for etag in headers; using a variable instead of a string literal to avoid TSLint "no-string-literal" warning
    const key = "etag";
    const flowEtag: string = result2Data[key];
    // check if etag exists
    assert.ok(flowEtag);
  });

  it("Etag and timestamp precision and time value must match, @loki", async () => {
    // first create the table for these tests
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };
    const createTableResult = await postToAzurite(
      "Tables",
      body,
      createTableHeaders,
      testConfig
    );
    assert.strictEqual(createTableResult.status, 201);

    const createEntityHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=fullmetadata"
    };
    const partitionKey = createUniquePartitionKey();
    const rowKey = "RK";
    // first create entity to overwrite
    const createEntityResult = await postToAzurite(
      reproFlowsTableName,
      `{"PartitionKey":"${partitionKey}","RowKey":"${rowKey}","Value":"01"}`,
      createEntityHeaders,
      testConfig
    );

    assert.strictEqual(
      createEntityResult.status,
      201,
      "We failed to create the entity to be later upserted using Rest"
    );

    const headers = createEntityResult.headers;
    assert.notStrictEqual(
      headers.etag,
      undefined,
      "We did not get an Etag that we need for our test!"
    );
    assert.strictEqual(
      headers.etag
        .replace("W/\"datetime'", "")
        .replace("'\"", "")
        .replace("%3A", ":")
        .replace("%3A", ":"),
      createEntityResult.data.Timestamp,
      "Etag and Timestamp value must match"
    );
  });

  it("Should be able to handle a batch request format from Azure-Storage/9.3.2, @loki", async () => {
    const body = JSON.stringify({
      TableName: reproFlowsTableName
    });
    const createTableHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata"
    };
    const createTableResult = await postToAzurite(
      "Tables",
      body,
      createTableHeaders,
      testConfig
    );
    assert.strictEqual(createTableResult.status, 201);

    // raw request from issue 1798 debug log ln 5368

    const batchWithFailingRequestString = `--batch_5ba88789-f5e2-415a-b48a-f2d3c3062937\r\nContent-Type: multipart/mixed; boundary=changeset_c71314eb-b086-4e81-a14b-668f8cbdbc12\r\n\r\n--changeset_c71314eb-b086-4e81-a14b-668f8cbdbc12\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPUT http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='0',RowKey='port_0_test-06gmr-cis-1_0_tengigabitethernet0%25fs3%25fs0') HTTP/1.1\r\nAccept: application/json;odata=minimalmetadata\r\nContent-Type: application/json\r\nDataServiceVersion: 3.0;\r\nIf-Match: W/\"datetime'2023-01-23T19%3A39%3A54.978799Z'\"\r\n\r\n{\"DeviceName\":\"test-06gmr-cis-1\",\"PortId\":\"port_0_test-06gmr-cis-1_0_tengigabitethernet0%fs3%fs0\",\"Bandwidth\":10000,\"AvailableBandwidth\":-1,\"Direction\":\"ToServiceProvider\",\"AzurePortName\":\"TenGigabitEthernet0/3/0\",\"ServiceProviderName\":\"microsoft er test\",\"ServiceProviderPortName\":\"A51-TEST-06GMR-CIS-1-PRI-A\",\"AuthorizedUsers\":\"\",\"PortpairId\":\"ppport_0_test-06gmr-cis-1_0_tengigabitethernet0%fs3%fs0\",\"TunnelInterfaceNames\":\"\",\"RackId\":\"\",\"PatchPanelId\":\"\",\"ConnectorType\":\"\",\"AdminState\":\"\",\"Description\":\"\",\"ExtendedLocationProperty\":\"\"}\r\n--changeset_c71314eb-b086-4e81-a14b-668f8cbdbc12\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPUT http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}(PartitionKey='0',RowKey='port_0_test-06gmr-cis-2_0_tengigabitethernet0%25fs3%25fs0') HTTP/1.1\r\nAccept: application/json;odata=minimalmetadata\r\nContent-Type: application/json\r\nDataServiceVersion: 3.0;\r\nIf-Match: W/\"datetime'2023-01-23T19%3A39%3A54.978799Z'\"\r\n\r\n{\"DeviceName\":\"test-06gmr-cis-2\",\"PortId\":\"port_0_test-06gmr-cis-2_0_tengigabitethernet0%fs3%fs0\",\"Bandwidth\":10000,\"AvailableBandwidth\":-1,\"Direction\":\"ToServiceProvider\",\"AzurePortName\":\"TenGigabitEthernet0/3/0\",\"ServiceProviderName\":\"microsoft er test\",\"ServiceProviderPortName\":\"A51-TEST-06GMR-CIS-2-SEC-A\",\"AuthorizedUsers\":\"\",\"PortpairId\":\"ppport_0_test-06gmr-cis-1_0_tengigabitethernet0%fs3%fs0\",\"TunnelInterfaceNames\":\"\",\"RackId\":\"\",\"PatchPanelId\":\"\",\"ConnectorType\":\"\",\"AdminState\":\"\",\"Description\":\"\",\"ExtendedLocationProperty\":\"\"}\r\n--changeset_c71314eb-b086-4e81-a14b-668f8cbdbc12\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST http://127.0.0.1:10002/devstoreaccount1/${reproFlowsTableName}() HTTP/1.1\r\nAccept: application/json;odata=minimalmetadata\r\nContent-Type: application/json\r\nPrefer: return-no-content\r\nDataServiceVersion: 3.0;\r\n\r\n{\"PartitionKey\":\"0\",\"RowKey\":\"portpair_0_microsoft er test_a51-test-06gmr-cis-1-pri-a\",\"PortPairName\":\"microsoft er test_A51-TEST-06GMR-CIS-1-PRI-A\",\"PortPairId\":\"ppport_0_test-06gmr-cis-1_0_tengigabitethernet0%fs3%fs0\",\"PrimaryDeviceName\":\"test-06gmr-cis-1\",\"PrimaryDevicePortId\":\"port_0_test-06gmr-cis-1_0_tengigabitethernet0%fs3%fs0\",\"PrimaryDevicePortName\":\"TenGigabitEthernet0/3/0\",\"SecondaryDeviceName\":\"test-06gmr-cis-2\",\"SecondaryDevicePortId\":\"port_0_test-06gmr-cis-2_0_tengigabitethernet0%fs3%fs0\",\"SecondaryDevicePortName\":\"TenGigabitEthernet0/3/0\",\"Description\":\"A51-TEST-06GMR-CIS-1-PRI-A\",\"ExtendedLocationProperty\":\"\",\"OverprovisionFactor\":4,\"AvailableBandwidth\":40000,\"ServiceProviderName\":\"microsoft er test\",\"AuthorizedUsers\":\"\",\"Stags\":\"\",\"PortPairUsabilityStatus\":true,\"AllowedSubscriptionsList\":\"\",\"SkipBilling\":false,\"PortpairEncapType\":\"\",\"PortpairType\":\"\",\"AllocationStatus\":\"\",\"AllocationDate\":\"\",\"PeeringLocation\":\"\",\"OwnerSubscriptionId\":\"00000000-0000-0000-0000-000000000000\",\"OwnerSubscriptionId@odata.type\":\"Edm.Guid\"}\r\n--changeset_c71314eb-b086-4e81-a14b-668f8cbdbc12--\r\n--batch_5ba88789-f5e2-415a-b48a-f2d3c3062937--\r\n`;

    const patchRequestResult = await postToAzurite(
      `$batch`,
      batchWithFailingRequestString,
      {
        version: "2019-02-02",
        options: {
          requestId: "5c43f514-9598-421a-a8d3-7b55a08a10c9",
          dataServiceVersion: "3.0"
        },
        multipartContentType:
          "multipart/mixed; boundary=batch_a10acba3-03e0-4200-b4da-a0cd4f0017f6",
        contentLength: 791,
        body: "ReadableStream"
      },
      testConfig
    );

    assert.strictEqual(patchRequestResult.status, 202);
    // we respond with a 404 inside the batch request for the
    // resources being modified, but that is irrelevant for the test.
    // https://docs.microsoft.com/en-us/rest/api/storageservices/merge-entity
    const resourceNotFound = patchRequestResult.data.match(
      "HTTP/1.1 404 Not Found"
    ).length;
    assert.strictEqual(resourceNotFound, 1);
  });
});

/**
 * Creates the headers for our test cases.
 *
 * @param {IfMatchTestCase} testCase
 * @param {TestHeaders} headers
 * @param {string} newEtag
 * @param {boolean} useNewEtag
 * @return {*}  {*}
 */
function createHeadersForIfMatchTest(
  testCase: IfMatchTestCase,
  headers: TestHeaders,
  newEtag: string
): any {
  testCase.ifMatch = testCase.ifMatch === "new" ? newEtag : testCase.ifMatch;
  if (testCase.useIfMatch) {
    headers["If-Match"] = testCase.ifMatch;
  }
  return headers;
}

function getHeadersForIfMatchTest(): TestHeaders {
  const testHeaders: TestHeaders = {
    "Content-Type": "application/json",
    version: "",
    "x-ms-client-request-id": "1",
    DataServiceVersion: "3"
  };
  return testHeaders;
}

interface TestHeaders {
  [key: string]: any;
}

interface IfMatchTestCase {
  name: string;
  body: string;
  useIfMatch: boolean;
  ifMatch: string;
  restFunction: (
    path: string,
    body: string,
    headers: any,
    config: ITableEntityTestConfig
  ) => Promise<AxiosResponse<any, any>>;
  expectedStatus: number;
  expectSuccess: boolean;
  errorMessage: string;
}
