import { Send, Paperclip } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  replyTo?: string | null;
  onCancelReply?: () => void;
}

export function ChatComposer({ value, onChange, onSend, disabled = false, replyTo = null, onCancelReply }: ChatComposerProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t bg-background p-4 shrink-0">
      {replyTo && (
        <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
          <div className="text-sm">Replying to <span className="font-medium">{replyTo}</span></div>
          <button onClick={onCancelReply} className="text-xs text-muted-foreground">Cancel</button>
        </div>
      )}
      <div className="flex items-end gap-3">
        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled}
          aria-label="Add attachment"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Textarea */}
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUpCapture={handleKeyPress}
          placeholder="Type your message..."
          className="min-h-12 resize-none py-3"
          disabled={disabled}
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
