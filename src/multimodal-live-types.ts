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

import type {
  Content,
  FunctionResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
} from "@google/genai";

/**
 * this module contains type-definitions and Type-Guards
 * the wire types themselves come from the `@google/genai` SDK
 */

// Type-definitions

/**
 * the model to use and the config to initiate the session with
 */
export type LiveConfig = {
  model: string;
  config?: LiveConnectConfig;
};

/* outgoing types (used for logging) */

export type LiveOutgoingMessage =
  | ClientContentMessage
  | RealtimeInputMessage
  | ToolResponseMessage;

export type ClientContentMessage = {
  clientContent: {
    turns: Content[];
    turnComplete: boolean;
  };
};

export type RealtimeInputMessage = {
  realtimeInput: {
    mediaChunks: { mimeType: string; data: string }[];
  };
};

export type ToolResponseMessage = {
  toolResponse: ToolResponse;
};

export type ToolResponse = {
  functionResponses: FunctionResponse[];
};

/** Incoming types */

export type LiveIncomingMessage =
  | ToolCallCancellationMessage
  | ToolCallMessage
  | ServerContentMessage
  | SetupCompleteMessage;

export type SetupCompleteMessage = { setupComplete: {} };

export type ServerContentMessage = {
  serverContent: ServerContent;
};

export type ServerContent = LiveServerContent;

export type ModelTurn = {
  modelTurn: Content;
};

export type ToolCallCancellationMessage = {
  toolCallCancellation: ToolCallCancellation;
};

export type ToolCallCancellation = LiveServerToolCallCancellation;

export type ToolCallMessage = {
  toolCall: ToolCall;
};

export type ToolCall = LiveServerToolCall;

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message: string | LiveOutgoingMessage | LiveIncomingMessage;
};

// Type-Guards

const prop = (a: any, prop: string) =>
  typeof a === "object" && a !== null && typeof a[prop] === "object";

// outgoing messages
export const isClientContentMessage = (a: unknown): a is ClientContentMessage =>
  prop(a, "clientContent");

export const isRealtimeInputMessage = (a: unknown): a is RealtimeInputMessage =>
  prop(a, "realtimeInput");

export const isToolResponseMessage = (a: unknown): a is ToolResponseMessage =>
  prop(a, "toolResponse");

// incoming messages
export const isSetupCompleteMessage = (a: unknown): a is SetupCompleteMessage =>
  prop(a, "setupComplete");

export const isServerContenteMessage = (a: any): a is ServerContentMessage =>
  prop(a, "serverContent");

export const isToolCallMessage = (a: any): a is ToolCallMessage =>
  prop(a, "toolCall");

export const isToolCallCancellationMessage = (
  a: unknown,
): a is ToolCallCancellationMessage =>
  prop(a, "toolCallCancellation") &&
  isToolCallCancellation((a as any).toolCallCancellation);

export const isModelTurn = (a: any): a is ModelTurn =>
  typeof (a as ModelTurn).modelTurn === "object";

export const isTurnComplete = (a: ServerContent) => !!a.turnComplete;

export const isInterrupted = (a: ServerContent) => !!a.interrupted;

export const isToolCallCancellation = (
  a: unknown,
): a is ToolCallCancellation =>
  typeof a === "object" && Array.isArray((a as any).ids);
