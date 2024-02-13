// Provides configuration for table entity tests
// allows us to run tests against Azure Storage Emulator or Azure Storage

import { configLogger } from "../../../src/common/Logger";
import { EMULATOR_ACCOUNT_KEY, EMULATOR_ACCOUNT_NAME } from "../../testutils";

class TableEntityTestConfig {
  public testAzure: boolean = false;
  public protocol: string = "http";
  public host: string = "127.0.0.1";
  public productionStyleHostName: string = "";
  public productionStyleSecondaryHostName: string = "";
  public port: number = 11002;
  public metadataDbPath = "__tableTestsStorage__";
  public enableDebugLog: boolean = true;
  public debugLogPath: string = "g:/debug.log";
  public accountName: string = EMULATOR_ACCOUNT_NAME;
  public sharedKey: string = EMULATOR_ACCOUNT_KEY;
}

export interface ITableEntityTestConfig {
  testAzure: boolean;
  enableDebugLog: boolean;
  protocol: string;
  port: number;
  host: string;
  productionStyleHostName: string;
  productionStyleSecondaryHostName: string;
  metadataDbPath: string;
  debugLogPath: string;
  accountName: string;
  sharedKey: string;
}

export default class TableTestConfigFactory {
  public static create(
    testAzure: boolean = false,
    enableDebugLog: boolean = false,
    useHTTPS: boolean = false,
    host: string = "127.0.0.1",
    productionStyleHostName: string = "devaccountstore1.table.core.windows.net",
    productionStyleSecondaryHostName: string = "devaccountstore1-secondary.table.core.windows.net",
    tablePort: number = 11002,
    debugLogPath: string = "g:/debug.log",
    metadataDbPath: string = "__tableTestsStorage__"
  ): TableEntityTestConfig {
    const config = new TableEntityTestConfig();
    config.protocol = useHTTPS ? "https" : "http";
    config.port = tablePort;
    if (testAzure) {
      config.testAzure = true;
      config.protocol = "https";
      config.port = 443;
      config.accountName = this.getAzureTableAccountName();
      config.sharedKey = this.getAzureTableAccountKey();
      config.host = config.accountName + ".table.core.windows.net";
    }
    config.productionStyleHostName = productionStyleHostName;
    config.productionStyleSecondaryHostName = productionStyleSecondaryHostName;
    config.enableDebugLog = enableDebugLog;
    configLogger(enableDebugLog);
    config.debugLogPath = debugLogPath;
    config.metadataDbPath = metadataDbPath;
    return config;
  }

  private static getAzureTableAccountName(): string {
    if (
      process.env.AZURITE_TABLE_ACCOUNT_NAME === undefined ||
      process.env.AZURITE_TABLE_ACCOUNT_KEY === ""
    ) {
      throw new Error(
        "Process environment variable AZURITE_TABLE_ACCOUNT_NAME must be set"
      );
    }
    return process.env.AZURITE_TABLE_ACCOUNT_NAME;
  }

  private static getAzureTableAccountKey(): string {
    if (
      process.env.AZURITE_TABLE_ACCOUNT_KEY === undefined ||
      process.env.AZURITE_TABLE_ACCOUNT_KEY === ""
    ) {
      throw new Error(
        "Process environment variable AZURITE_TABLE_ACCOUNT_KEY must be set"
      );
    }
    return process.env.AZURITE_TABLE_ACCOUNT_KEY;
  }
}
