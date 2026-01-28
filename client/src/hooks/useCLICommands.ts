/**
 * useCLICommands Hook
 * 
 * Manages CLI command state, parsing, and execution.
 * Provides interactive command suggestions and execution handling.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { CLICommand, CommandType, ParseResult } from "../lib/cli";
import { 
  parseCommand, 
  validateCommand, 
  extractType, 
  extractTypeAndAction,
  allCommands,
  mainMentionTypes,
  commandGroups,
} from "../lib/cli";

export type SuggestionType = "type" | "action" | "option" | "example";

export interface Suggestion {
  id: string;
  type: SuggestionType;
  label: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  command?: CLICommand;
  insertText: string;
}

interface UseCLICommandsReturn {
  // State
  input: string;
  setInput: (value: string) => void;
  cursorPosition: number;
  setCursorPosition: (pos: number) => void;
  
  // Parsed data
  parsed: ParseResult | null;
  isCommand: boolean;
  currentType: CommandType | null;
  
  // Suggestions
  suggestions: Suggestion[];
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: (index: number) => void;
  
  // Actions
  insertSuggestion: (suggestion: Suggestion) => void;
  executeCommand: () => Promise<void>;
  reset: () => void;
  
  // UI state
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
}

export function useCLICommands(
  onExecute?: (parsed: ParseResult) => Promise<void>
): UseCLICommandsReturn {
  const [input, setInput] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Parse current input
  const parsed = useMemo(() => {
    if (!input.trim().startsWith("@")) return null;
    return parseCommand(input);
  }, [input]);

  const isCommand = input.trim().startsWith("@");
  const currentType = parsed?.type || null;

  // Generate suggestions based on current input state
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];

    if (!isCommand) return result;

    const { type, action } = extractTypeAndAction(input);

    // Stage 1: No type selected yet - show main types
    if (!type) {
      return mainMentionTypes.map(t => ({
        id: `type-${t.id}`,
        type: "type" as SuggestionType,
        label: t.label,
        description: t.description,
        icon: t.icon,
        insertText: `@${t.label} `,
      }));
    }

    // Stage 2: Type selected but no action - show actions for that type
    if (type && !action) {
      const group = commandGroups.find(g => g.type === type);
      if (group) {
        return group.commands.map(cmd => ({
          id: `action-${cmd.id}`,
          type: "action" as SuggestionType,
          label: cmd.label,
          description: cmd.description,
          icon: cmd.icon,
          command: cmd,
          insertText: `@${type} ${cmd.label} `,
        }));
      }
    }

    // Stage 3: Type and action selected - show options and examples
    if (type && action && parsed) {
      const command = allCommands.find(
        cmd => cmd.type === type && cmd.action === action
      );

      if (command) {
        // Add available options
        command.options.forEach(opt => {
          const isUsed = parsed.args[opt.name] || (opt.alias && parsed.args[opt.alias]);
          if (!isUsed) {
            result.push({
              id: `option-${opt.name}`,
              type: "option" as SuggestionType,
              label: `--${opt.name}`,
              description: opt.description,
              insertText: `--${opt.name} `,
            });
            
            if (opt.alias) {
              result.push({
                id: `option-${opt.alias}`,
                type: "option" as SuggestionType,
                label: `-${opt.alias}`,
                description: opt.description,
                insertText: `-${opt.alias} `,
              });
            }
          }
        });

        // Add examples
        command.examples.forEach((ex, i) => {
          result.push({
            id: `example-${i}`,
            type: "example" as SuggestionType,
            label: "Example",
            description: ex,
            insertText: ex,
          });
        });
      }
    }

    return result;
  }, [input, isCommand, parsed]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [suggestions.length]);

  // Insert a suggestion into the input
  const insertSuggestion = useCallback((suggestion: Suggestion) => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);

    // Find what to replace based on suggestion type
    let newTextBefore = textBeforeCursor;
    
    if (suggestion.type === "type") {
      // Replace @partial with @type
      newTextBefore = textBeforeCursor.replace(/@\w*$/, suggestion.insertText);
    } else if (suggestion.type === "action") {
      // Replace @type partial with @type action
      newTextBefore = textBeforeCursor.replace(/@\w+\s+\w*$/, suggestion.insertText);
    } else {
      // Just insert at cursor
      newTextBefore = textBeforeCursor + suggestion.insertText;
    }

    const newValue = newTextBefore + textAfterCursor;
    setInput(newValue);

    // Focus and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = newTextBefore.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);

    // Keep suggestions open if we might have more
    if (suggestion.type === "type" || suggestion.type === "action") {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input]);

  // Execute the current command
  const executeCommand = useCallback(async () => {
    if (!parsed || !onExecute) return;

    const validated = validateCommand(parsed);
    if (validated?.isValid) {
      await onExecute(parsed);
      reset();
    }
  }, [parsed, onExecute]);

  // Reset state
  const reset = useCallback(() => {
    setInput("");
    setCursorPosition(0);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(0);
  }, []);

  return {
    input,
    setInput,
    cursorPosition,
    setCursorPosition,
    parsed,
    isCommand,
    currentType,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    insertSuggestion,
    executeCommand,
    reset,
    showSuggestions,
    setShowSuggestions,
  };
}
