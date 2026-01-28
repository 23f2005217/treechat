/**
 * CLI Parser Module
 * 
 * Parses command input strings into structured command objects.
 * Supports parsing @type action --option value format.
 */

import type { CLICommand, CommandType, CommandAction } from "./commands";
import { allCommands } from "./commands";

export interface ParsedCommand {
  command: CLICommand;
  args: Record<string, string>;
  raw: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  type: CommandType | null;
  action: CommandAction | null;
  args: Record<string, string>;
  raw: string;
  suggestions: string[];
}

/**
 * Parse a command string into structured data
 * Format: @type action --option value -o value
 */
export function parseCommand(input: string): ParseResult {
  const trimmed = input.trim();
  
  // Check if it's a command (starts with @)
  if (!trimmed.startsWith("@")) {
    return {
      type: null,
      action: null,
      args: {},
      raw: trimmed,
      suggestions: [],
    };
  }

  // Remove @ and split into parts
  const withoutAt = trimmed.slice(1);
  const parts = withoutAt.split(/\s+/);
  
  if (parts.length === 0) {
    return {
      type: null,
      action: null,
      args: {},
      raw: trimmed,
      suggestions: [],
    };
  }

  const type = parts[0] as CommandType;
  const action = parts[1] as CommandAction | undefined;
  
  // Parse arguments
  const args: Record<string, string> = {};
  let currentKey: string | null = null;
  
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.startsWith("--")) {
      currentKey = part.slice(2);
      args[currentKey] = "";
    } else if (part.startsWith("-") && part.length === 2) {
      currentKey = part.slice(1);
      args[currentKey] = "";
    } else if (currentKey) {
      args[currentKey] = args[currentKey] ? `${args[currentKey]} ${part}` : part;
      currentKey = null;
    } else {
      // Positional argument (treat as title/content if no key)
      if (!args["title"]) {
        args["title"] = part;
      } else {
        args["title"] += ` ${part}`;
      }
    }
  }

  // Generate suggestions based on current state
  const suggestions = generateSuggestions(type, action, args);

  return {
    type,
    action: action || null,
    args,
    raw: trimmed,
    suggestions,
  };
}

/**
 * Generate command suggestions based on current input state
 */
function generateSuggestions(
  type: CommandType | null,
  action: CommandAction | null,
  args: Record<string, string>
): string[] {
  const suggestions: string[] = [];

  if (!type) {
    return ["@task", "@reminder", "@event"];
  }

  if (!action) {
    const commands = allCommands.filter(cmd => cmd.type === type);
    return commands.map(cmd => `@${type} ${cmd.label}`);
  }

  // Find matching command
  const command = allCommands.find(
    cmd => cmd.type === type && cmd.action === action
  );

  if (command) {
    // Suggest missing required options
    const missingRequired = command.options.filter(
      opt => opt.required && !args[opt.name] && !args[opt.alias || ""]
    );
    
    missingRequired.forEach(opt => {
      suggestions.push(`--${opt.name} <${opt.placeholder || "value"}>`);
    });

    // Suggest optional options
    const availableOptions = command.options.filter(
      opt => !args[opt.name] && !args[opt.alias || ""]
    );
    
    availableOptions.forEach(opt => {
      if (!opt.required) {
        suggestions.push(`[--${opt.name}]`);
      }
    });
  }

  return suggestions;
}

/**
 * Validate a parsed command
 */
export function validateCommand(parseResult: ParseResult): ParsedCommand | null {
  if (!parseResult.type || !parseResult.action) {
    return null;
  }

  const command = allCommands.find(
    cmd => cmd.type === parseResult.type && cmd.action === parseResult.action
  );

  if (!command) {
    return {
      command: allCommands[0], // Fallback
      args: parseResult.args,
      raw: parseResult.raw,
      isValid: false,
      errors: [`Unknown command: @${parseResult.type} ${parseResult.action}`],
    };
  }

  const errors: string[] = [];

  // Check required options
  command.options.forEach(opt => {
    if (opt.required) {
      const hasValue = parseResult.args[opt.name] || (opt.alias && parseResult.args[opt.alias]);
      if (!hasValue) {
        errors.push(`Missing required option: --${opt.name}`);
      }
    }
  });

  return {
    command,
    args: parseResult.args,
    raw: parseResult.raw,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if input is a complete command (ready to execute)
 */
export function isCompleteCommand(input: string): boolean {
  const parsed = parseCommand(input);
  const validated = validateCommand(parsed);
  return validated !== null && validated.isValid;
}

/**
 * Get command preview/help text
 */
export function getCommandHelp(command: CLICommand): string {
  const options = command.options
    .map(opt => {
      const required = opt.required ? "" : "?";
      const alias = opt.alias ? `|-${opt.alias}` : "";
      return `[--${opt.name}${alias}${required}]`;
    })
    .join(" ");
  
  return `@${command.type} ${command.label} ${options}`;
}

/**
 * Extract the type from partial input
 */
export function extractType(input: string): string | null {
  const match = input.match(/^@(\w*)/);
  return match ? match[1] : null;
}

/**
 * Extract type and action from partial input
 */
export function extractTypeAndAction(input: string): { type: string | null; action: string | null } {
  const match = input.match(/^@(\w+)(?:\s+(\w*))?/);
  if (!match) return { type: null, action: null };
  return { type: match[1], action: match[2] || null };
}

/**
 * Format command for display
 */
export function formatCommandPreview(parsed: ParseResult): string {
  if (!parsed.type) return "";
  if (!parsed.action) return `@${parsed.type}`;
  
  const args = Object.entries(parsed.args)
    .filter(([key]) => key !== "title")
    .map(([key, value]) => `--${key} "${value}"`)
    .join(" ");
  
  const title = parsed.args.title || "";
  
  return `@${parsed.type} ${parsed.action} ${title} ${args}`.trim();
}
