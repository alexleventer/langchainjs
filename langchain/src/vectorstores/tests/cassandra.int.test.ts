/* eslint-disable no-process-env */
import { test, expect, describe } from "@jest/globals";
import { Document } from "../../document.js";
import { CassandraStore } from "../cassandra.js";
import { OpenAIEmbeddings } from "../../embeddings/openai.js";
import path from "path";

describe.skip("CassandraStore", () => {
  const cassandraClientConfig = {
    cloud: {
      secureConnectBundle: (path.resolve("./") +
        process.env.CASSANDRA_SCB) as string,
    },
    credentials: {
      username: "token",
      password: process.env.CASSANDRA_TOKEN as string,
    },
    keyspace: "test",
    dimensions: 1536,
    table: "test",
    primaryKey: {
      name: "id",
      type: "int",
    },
    metadataColumns: [
      {
        name: "name",
        type: "text",
      },
    ],
  };

  const cassandraJsonApiConfig = {
    keyspace: "test",
    dimensions: 1536,
    table: "test_jsonapi",
    primaryKey: {
      name: "id",
      type: "int",
    },
    metadataColumns: [
      {
        name: "name",
        type: "text",
      },
    ],
    astraId: process.env.ASTRA_DB_ID as string,
    astraRegion: process.env.ASTRA_DB_REGION as string,
    astraKeyspace: process.env.ASTRA_DB_KEYSPACE as string,
    astraApplicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN as string,
  };

  test("CassandraStore.fromText by jsonApi", async () => {
    const vectorStore = await CassandraStore.fromTexts(
      ["I am blue", "Green yellow purple", "Hello there hello"],
      [
        { id: 2, name: "2" },
        { id: 1, name: "1" },
        { id: 3, name: "3" },
      ],
      new OpenAIEmbeddings(),
      cassandraJsonApiConfig
    );

    const results = await vectorStore.findVectorSearch(
      "Green yellow purple",
      1
    );

    expect(results.length).toEqual(1);
    expect(results[0].text).toEqual("Green yellow purple");
    expect(results[0].id).toEqual(1);
    expect(results[0].name).toEqual("1");
  });

  test("CassandraStore.fromText by cassandraClient", async () => {
    const vectorStore = await CassandraStore.fromTexts(
      ["I am blue", "Green yellow purple", "Hello there hello"],
      [
        { id: 2, name: "2" },
        { id: 1, name: "1" },
        { id: 3, name: "3" },
      ],
      new OpenAIEmbeddings(),
      cassandraClientConfig
    );

    const results = await vectorStore.similaritySearch(
      "Green yellow purple",
      1
    );

    expect(results).toEqual([
      new Document({
        pageContent: "Green yellow purple",
        metadata: { id: 1, name: "1" },
      }),
    ]);
  });

  test("CassandraStore.fromExistingIndex by jsonApi", async () => {
    await CassandraStore.fromTexts(
      ["Hey", "Whats up", "Hello"],
      [
        { id: 2, name: "2" },
        { id: 1, name: "1" },
        { id: 3, name: "3" },
      ],
      new OpenAIEmbeddings(),
      cassandraJsonApiConfig
    );
    const vectorStore = await CassandraStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      cassandraJsonApiConfig
    );
    const results = await vectorStore.findVectorSearch("Whats up", 1);

    expect(results.length).toEqual(1);
    expect(results[0].text).toEqual("Whats up");
    expect(results[0].id).toEqual(1);
    expect(results[0].name).toEqual("1");
  });

  test("CassandraStore.fromExistingIndex by cassandraClient", async () => {
    await CassandraStore.fromTexts(
      ["Hey", "Whats up", "Hello"],
      [
        { id: 2, name: "2" },
        { id: 1, name: "1" },
        { id: 3, name: "3" },
      ],
      new OpenAIEmbeddings(),
      cassandraClientConfig
    );
    const vectorStore = await CassandraStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      cassandraClientConfig
    );

    const results = await vectorStore.similaritySearch("Whats up", 1);
    expect(results).toEqual([
      new Document({
        pageContent: "Whats up",
        metadata: { id: 1, name: "1" },
      }),
    ]);
  });
});
