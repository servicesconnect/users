import { Client } from "@elastic/elasticsearch";
import { ClusterHealthResponse } from "@elastic/elasticsearch/lib/api/types";
import { envConfig, winstonLogger } from "@users/config";
import { Logger } from "winston";

const log: Logger = winstonLogger("usersElasticSearchServer", "debug");

const elasticSearchClient = new Client({
  node: `${envConfig.elastic_search_url}`,
});

export async function startAndCheckElasticConnection(): Promise<void> {
  let isConnected = false;
  while (!isConnected) {
    log.info("UsersService connecting to ElasticSearch...");
    try {
      const health: ClusterHealthResponse =
        await elasticSearchClient.cluster.health({});
      log.info(`UsersService Elasticsearch health status - ${health.status}`);
      isConnected = true;
    } catch (error) {
      log.error("Connection to Elasticsearch failed. Retrying...");
      log.log("error", "UsersService checkConnection() method:", error);
    }
  }
}
