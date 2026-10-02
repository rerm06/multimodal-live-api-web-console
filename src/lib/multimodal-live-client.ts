/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Content,
  GoogleGenAI,
  LiveServerMessage,
  Part,
  Session,
} from "@google/genai";
import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import {
  ClientContentMessage,
  isInterrupted,
  isModelTurn,
  isTurnComplete,
  LiveIncomingMessage,
  ModelTurn,
  RealtimeInputMessage,
  ServerContent,
  StreamingLog,
  ToolCall,
  ToolCallCancellation,
  ToolResponse,
  ToolResponseMessage,
  type LiveConfig,
} from "../multimodal-live-types";
import { base64ToArrayBuffer } from "./utils";

/**
 * the events that this client will emit
 */
interface MultimodalLiveClientEventTypes {
  open: () => void;
  log: (log: StreamingLog) => void;
  close: (event: CloseEvent) => void;
  audio: (data: ArrayBuffer) => void;
  content: (data: ServerContent) => void;
  interrupted: () => void;
  setupcomplete: () => void;
  turncomplete: () => void;
  toolcall: (toolCall: ToolCall) => void;
  toolcallcancellation: (toolcallCancellation: ToolCallCancellation) => void;
}

export type MultimodalLiveAPIClientConnection = {
  apiKey: string;
  /** defaults to the SDK's current Live API version */
  apiVersion?: string;
};

/**
 * A event-emitting class that manages the Live API session (through the
 * `@google/genai` SDK) and emits events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
  protected client: GoogleGenAI;
  public session: Session | null = null;
  protected config: LiveConfig | null = null;
  public getConfig() {
    return { ...this.config };
  }

  constructor({ apiKey, apiVersion }: MultimodalLiveAPIClientConnection) {
    super();
    this.client = new GoogleGenAI({
      apiKey,
      ...(apiVersion ? { httpOptions: { apiVersion } } : {}),
    });
    this.send = this.send.bind(this);
  }

  log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  async connect(config: LiveConfig): Promise<boolean> {
    this.config = config;

    let session: Session | null = null;
    try {
      session = await this.client.live.connect({
        model: config.model,
        config: config.config,
        callbacks: {
          onopen: () => {
            this.log("client.open", "connected to socket");
            this.emit("open");
          },
          onmessage: (message: LiveServerMessage) => this.receive(message),
          onerror: (ev: ErrorEvent) => {
            this.log("server.error", ev.message || "error");
          },
          onclose: (ev: CloseEvent) => {
            // could be an old session and theres already a new instance
            if (session && this.session !== session) {
              return;
            }
            this.session = null;
            let reason = ev.reason || "";
            if (reason.toLowerCase().includes("error")) {
              const prelude = "ERROR]";
              const preludeIndex = reason.indexOf(prelude);
              if (preludeIndex > 0) {
                reason = reason.slice(
                  preludeIndex + prelude.length + 1,
                  Infinity,
                );
              }
            }
            this.log(
              `server.${ev.type}`,
              `disconnected ${reason ? `with reason: ${reason}` : ``}`,
            );
            this.emit("close", ev);
          },
        },
      });
    } catch (e) {
      const message = `Could not connect to the Live API: ${(e as Error).message}`;
      this.log("server.error", message);
      throw new Error(message);
    }
    this.session = session;
    this.log("client.send", "setup");
    return true;
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.log("client.close", `Disconnected`);
      return true;
    }
    return false;
  }

  protected receive(response: LiveServerMessage) {
    if (response.toolCall) {
      this.log("server.toolCall", response as LiveIncomingMessage);
      this.emit("toolcall", response.toolCall);
      return;
    }
    if (response.toolCallCancellation) {
      this.log("receive.toolCallCancellation", response as LiveIncomingMessage);
      this.emit("toolcallcancellation", response.toolCallCancellation);
      return;
    }

    if (response.setupComplete) {
      this.log("server.send", "setupComplete");
      this.emit("setupcomplete");
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (response.serverContent) {
      const { serverContent } = response;
      if (isInterrupted(serverContent)) {
        this.log("receive.serverContent", "interrupted");
        this.emit("interrupted");
        return;
      }
      if (isTurnComplete(serverContent)) {
        this.log("server.send", "turnComplete");
        this.emit("turncomplete");
        //plausible theres more to the message, continue
      }

      if (isModelTurn(serverContent)) {
        let parts: Part[] = serverContent.modelTurn.parts || [];

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter((p) =>
          p.inlineData?.mimeType?.startsWith("audio/pcm"),
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);

        base64s.forEach((b64) => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);
            this.log(`server.audio`, `buffer (${data.byteLength})`);
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: ModelTurn = { modelTurn: { parts } };
        this.emit("content", content);
        this.log(`server.content`, { serverContent: content });
      }
    } else {
      console.log("received unmatched message", response);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: RealtimeInputMessage["realtimeInput"]["mediaChunks"]) {
    const session = this.requireSession();
    let hasAudio = false;
    let hasVideo = false;
    for (const ch of chunks) {
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
        session.sendRealtimeInput({ audio: ch });
      } else if (ch.mimeType.includes("image")) {
        hasVideo = true;
        session.sendRealtimeInput({ video: ch });
      }
    }
    const message =
      hasAudio && hasVideo
        ? "audio + video"
        : hasAudio
          ? "audio"
          : hasVideo
            ? "video"
            : "unknown";

    this.log(`client.realtimeInput`, message);
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: ToolResponse) {
    this.requireSession().sendToolResponse(toolResponse);
    const message: ToolResponseMessage = { toolResponse };
    this.log(`client.toolResponse`, message);
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    parts = Array.isArray(parts) ? parts : [parts];
    const content: Content = {
      role: "user",
      parts,
    };

    this.requireSession().sendClientContent({ turns: [content], turnComplete });
    const clientContentRequest: ClientContentMessage = {
      clientContent: {
        turns: [content],
        turnComplete,
      },
    };
    this.log(`client.send`, clientContentRequest);
  }

  protected requireSession(): Session {
    if (!this.session) {
      throw new Error("Live API session is not connected");
    }
    return this.session;
  }
}
