import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import type {
  AgentRunEvent,
  PromptResponse,
} from "../models/agentModels";

const hubUrl =
  import.meta.env.VITE_ORCHESTRATOR_HUB_URL ??
  "http://localhost:5000/hubs/orchestrator";

export class OrchestratorClient {
  private connection: HubConnection;

  constructor() {
    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();
  }

  public async connect(
    onRunEvent: (event: AgentRunEvent) => void,
  ): Promise<void> {
    this.connection.off("AgentRunEvent");

    this.connection.on(
      "AgentRunEvent",
      (event: AgentRunEvent) => {
        onRunEvent(event);
      },
    );

    if (
      this.connection.state ===
      HubConnectionState.Disconnected
    ) {
      await this.connection.start();
    }
  }

  public async runPrompt(
    prompt: string,
  ): Promise<PromptResponse> {
    if (
      this.connection.state !==
      HubConnectionState.Connected
    ) {
      throw new Error(
        "The orchestrator connection is not active.",
      );
    }

    return await this.connection.invoke<PromptResponse>(
      "RunPrompt",
      prompt,
    );
  }

  public async resetConversation(): Promise<void> {
    if (
      this.connection.state !==
      HubConnectionState.Connected
    ) {
      throw new Error(
        "The orchestrator connection is not active.",
      );
    }

    await this.connection.invoke<void>(
      "ResetConversation",
    );
  }
  
  public async disconnect(): Promise<void> {
    if (
      this.connection.state !==
      HubConnectionState.Disconnected
    ) {
      await this.connection.stop();
    }
  }
}