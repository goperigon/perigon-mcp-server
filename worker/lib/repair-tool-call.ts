import { AnthropicProvider } from "@ai-sdk/anthropic";
import {
  generateObject,
  InvalidToolInputError,
  NoSuchToolError,
  type ToolCallRepairFunction,
  type ToolSet,
} from "ai";

/**
 * Builds the `experimental_repairToolCall` callback handed to `streamText`.
 *
 * Two recoverable failure modes are handled:
 *   - Invalid tool input (`InvalidToolInputError`): use `generateObject` to
 *     coerce the model's bad arguments into the tool's zod schema, then return
 *     a fresh `tool-call` chunk with the repaired input.
 *   - Unknown tool (`NoSuchToolError`): not recoverable client-side, return
 *     null so the SDK surfaces the error.
 *
 * Tool *execution* errors no longer flow through this hook in AI SDK v5; they
 * appear as `tool-error` parts in the stream so the model can react in the
 * next step (bounded by `stopWhen` on the caller).
 */
export function createRepairToolCall<TOOLS extends ToolSet>(
  anthropic: AnthropicProvider,
  modelId: string
): ToolCallRepairFunction<TOOLS> {
  return async ({ toolCall, tools, error, inputSchema }) => {
    console.log(`Attempting to repair tool call: ${toolCall.toolName}`, {
      error: error.message,
      input: toolCall.input,
    });

    if (InvalidToolInputError.isInstance(error)) {
      return repairInvalidInput({
        toolCall,
        tools,
        anthropic,
        modelId,
        inputSchema,
      });
    }

    if (NoSuchToolError.isInstance(error)) {
      console.log(`Tool ${toolCall.toolName} not found, cannot repair`);
      return null;
    }

    console.log(
      `Unknown error type for tool call ${toolCall.toolName}, cannot repair`
    );
    return null;
  };
}

interface RepairInvalidInputArgs<TOOLS extends ToolSet> {
  toolCall: Parameters<ToolCallRepairFunction<TOOLS>>[0]["toolCall"];
  tools: TOOLS;
  anthropic: AnthropicProvider;
  modelId: string;
  inputSchema: Parameters<ToolCallRepairFunction<TOOLS>>[0]["inputSchema"];
}

async function repairInvalidInput<TOOLS extends ToolSet>({
  toolCall,
  tools,
  anthropic,
  modelId,
  inputSchema,
}: RepairInvalidInputArgs<TOOLS>) {
  const tool = tools[toolCall.toolName as keyof TOOLS];
  if (!tool) {
    console.error(`Tool ${toolCall.toolName} not found in tools object`);
    return null;
  }

  try {
    const { object: repairedInput } = await generateObject({
      model: anthropic(modelId),
      schema: tool.inputSchema,
      prompt: buildRepairPrompt(
        toolCall.toolName,
        toolCall.input,
        inputSchema({ toolName: toolCall.toolName })
      ),
    });

    console.log(
      `Successfully repaired arguments for ${toolCall.toolName}:`,
      repairedInput
    );

    return {
      type: "tool-call" as const,
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      input: JSON.stringify(repairedInput),
    };
  } catch (repairError) {
    console.error(
      `Failed to repair tool call ${toolCall.toolName}:`,
      repairError
    );
    return null;
  }
}

function buildRepairPrompt(
  toolName: string,
  badInput: string,
  schema: unknown
): string {
  return [
    `The AI model tried to call the tool "${toolName}" with invalid arguments:`,
    badInput,
    `The tool accepts the following schema:`,
    JSON.stringify(schema),
    `Please fix the arguments to match the schema exactly. Focus on:`,
    `- Correct data types (string, number, boolean, array, object)`,
    `- Required fields that may be missing`,
    `- Proper formatting and structure`,
    `- Valid enum values if applicable`,
  ].join("\n");
}
