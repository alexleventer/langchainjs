import { test, expect, describe } from "@jest/globals";
import { AIMessage, HumanMessage } from "../../schema/index.js";
import { CassandraChatMessageHistory } from "../message/cassandra.js";
import { v4 } from "uuid";
import { BufferMemory } from "../../memory/buffer_memory.js";
import { ChatOpenAI } from "../../chat_models/openai.js";
import { ConversationChain } from "../../chains/conversation.js";

describe("Cassandra message history", () => {
  const cassandraJsonApiConfig = {
    keyspace: "test",
    table: "messages",

    astraId: process.env.ASTRA_DB_ID as string,
    astraRegion: process.env.ASTRA_DB_REGION as string,
    astraKeyspace: process.env.ASTRA_DB_KEYSPACE as string,
    astraApplicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN as string,
  };

  test("Test Cassandra history store and clear", async () => {
    const id = v4();
    const chatHistory = new CassandraChatMessageHistory(
      cassandraJsonApiConfig,
      id
    );

    const beforeMessages = await chatHistory.getMessages();
    expect(beforeMessages).toStrictEqual([]);

    await chatHistory.addUserMessage("Hi! I am alex.");
    await chatHistory.addAIChatMessage(
      "Hello, Alex! How can I assist you today?"
    );

    const expectedMessages = [
      new HumanMessage("Hi! I am alex."),
      new AIMessage("Hello, Alex! How can I assist you today?"),
    ];

    const resultWithHistory = await chatHistory.getMessages();

    expect(resultWithHistory.sort()).toEqual(expectedMessages.sort());

    await chatHistory.clear();

    const blankResult = await chatHistory.getMessages();
    expect(blankResult).toStrictEqual([]);
  });

  test("Test Cassandra memory with Buffer Memory", async () => {
    const id = v4();
    const memory = new BufferMemory({
      returnMessages: true,
      chatHistory: new CassandraChatMessageHistory(cassandraJsonApiConfig, id),
    });

    await memory.saveContext(
      { input: "Hi! I am alex." },
      { response: "Hello, Alex! How can I assist you today?" }
    );

    const expectedHistory = [
      new HumanMessage("Hi! I am alex."),
      new AIMessage("Hello, Alex! How can I assist you today?"),
    ];
    const result2 = await memory.loadMemoryVariables({});

    expect(result2).toEqual({ history: expectedHistory });
  });

  test("Test Cassandra memory with LLM Chain", async () => {
    const id = v4();
    const memory = new BufferMemory({
      returnMessages: true,
      chatHistory: new CassandraChatMessageHistory(cassandraJsonApiConfig, id),
    });

    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    });
    const chain = new ConversationChain({ llm: model, memory });

    const res1 = await chain.call({ input: "Hi! I am alex." });
    console.log({ res1 });

    const res2 = await chain.call({
      input: "What was my name?",
    });
    console.log({ res2 });
  });
});
