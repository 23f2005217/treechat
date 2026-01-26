import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { GitFork, FileText, ScrollText, Sparkles } from "lucide-react";

export type ForkType = "summary" | "full" | "empty";

interface ForkThreadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFork: (title: string, forkType: ForkType) => void;
  sourceThreadName?: string;
}

export function ForkThreadDialog({
  isOpen,
  onClose,
  onFork,
  sourceThreadName = "this thread",
}: ForkThreadDialogProps) {
  const [title, setTitle] = useState("");
  const [forkType, setForkType] = useState<ForkType>("summary");

  const handleSubmit = () => {
    const finalTitle = title.trim() || `Fork of ${sourceThreadName}`;
    onFork(finalTitle, forkType);
    setTitle("");
    setForkType("summary");
    onClose();
  };

  const forkOptions = [
    {
      value: "summary" as ForkType,
      label: "With Summary",
      description: "Start with a brief summary of the conversation so far",
      icon: ScrollText,
    },
    {
      value: "full" as ForkType,
      label: "Full Context",
      description: "Copy all messages up to this point",
      icon: FileText,
    },
    {
      value: "empty" as ForkType,
      label: "Fresh Start",
      description: "Start a new thread with no context copied",
      icon: Sparkles,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5" />
            Fork Thread
          </DialogTitle>
          <DialogDescription>
            Create a new thread branching from this conversation. Choose how much context to carry over.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="thread-title">Thread Name</Label>
            <Input
              id="thread-title"
              placeholder={`Fork of ${sourceThreadName}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Context Options</Label>
            <RadioGroup
              value={forkType}
              onValueChange={(value: string) => setForkType(value as ForkType)}
              className="space-y-2"
            >
              {forkOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      forkType === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <GitFork className="h-4 w-4 mr-2" />
            Create Fork
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
