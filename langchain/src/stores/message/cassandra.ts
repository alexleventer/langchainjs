import {
  BaseMessage,
  BaseListChatMessageHistory,
  StoredMessage,
} from "../../schema/index.js";
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "./utils.js";
import axiosMod, { AxiosRequestConfig } from "axios";

export interface CassandraJsonApiConfig {
  keyspace: string;
  table: string;
  astraId?: string;
  astraRegion?: string;
  astraKeyspace?: string;
  astraApplicationToken?: string;
}

export interface Messages extends StoredMessage {
  session_id: string;
}
export class CassandraChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "mongodb"];

  private sessionId: string;

  private readonly astraId: string | undefined;

  private readonly astraRegion: string | undefined;

  private readonly astraKeyspace: string | undefined;

  private readonly astraApplicationToken: string | undefined;

  private readonly table: string | undefined;

  constructor(args: CassandraJsonApiConfig, sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.table = args.table;
    this.astraId = args?.astraId;
    this.astraRegion = args?.astraRegion;
    this.astraKeyspace = args?.astraKeyspace;
    this.astraApplicationToken = args?.astraApplicationToken;
  }

  async getMessages(): Promise<BaseMessage[]> {
    let data = JSON.stringify({
      find: {
        filter: {
          session_id: this.sessionId,
        },
      },
    });
    const config: AxiosRequestConfig = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://${this.astraId}-${this.astraRegion}.apps.astra.datastax.com/api/json/v1/${this.astraKeyspace}/${this.table}`,
      headers: {
        "x-cassandra-token": this.astraApplicationToken ?? "",
        "Content-Type": "application/json",
      },
      data: data,
    };

    const colection = await axiosMod.request(config);
    const response = colection?.data?.data?.documents;

    const messages: StoredMessage[] = response.map((res: any) => {
      return {
        type: res.type,
        data: res.data,
      };
    });

    return mapStoredMessagesToChatMessages(messages);
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const messageToAdd = mapChatMessagesToStoredMessages([message]);
    let messages: Messages = {
      session_id: this.sessionId,
      ...messageToAdd[0],
    };

    const data = JSON.stringify({
      insertOne: {
        document: messages,
      },
    });

    const config: AxiosRequestConfig = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://${this.astraId}-${this.astraRegion}.apps.astra.datastax.com/api/json/v1/${this.astraKeyspace}/${this.table}`,
      headers: {
        "x-cassandra-token": this.astraApplicationToken ?? "",
        "Content-Type": "application/json",
      },
      data: data,
    };

    await axiosMod.request(config);
  }

  async clear(): Promise<void> {
    const data = JSON.stringify({
      findOneAndDelete: {
        filter: { session_id: this.sessionId },
      },
    });

    const config: AxiosRequestConfig = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://${this.astraId}-${this.astraRegion}.apps.astra.datastax.com/api/json/v1/${this.astraKeyspace}/${this.table}`,
      headers: {
        "x-cassandra-token": this.astraApplicationToken ?? "",
        "Content-Type": "application/json",
      },
      data: data,
    };

    const resp = await axiosMod.request(config);

    if (resp.data.status.deletedCount === 1) {
      await this.clear();
    }
  }
}
