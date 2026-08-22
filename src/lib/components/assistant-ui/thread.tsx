"use client";

import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/lib/components/assistant-ui/attachment";
import { File } from "@/lib/components/assistant-ui/file";
import { ThreadFollowupSuggestions } from "@/lib/components/assistant-ui/follow-up-suggestions";
import { Image } from "@/lib/components/assistant-ui/image";
import { MarkdownText } from "@/lib/components/assistant-ui/markdown-text";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/lib/components/assistant-ui/reasoning";
import { ToolFallback } from "@/lib/components/assistant-ui/tool-fallback";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/lib/components/assistant-ui/tool-group";
import { WorkingStatus } from "@/lib/components/assistant-ui/working-status";
import { TooltipIconButton } from "@/lib/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/lib/components/ui/button";
import { BidiText } from "@/lib/ai/bidiText";
import { MAX_AI_MESSAGE_CHARS } from "@/lib/ai/aiMessageLimits";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  ThreadPrimitive,
  type FileMessagePartComponent,
  type ImageMessagePartComponent,
  type TextMessagePartComponent,
  type ToolCallMessagePartComponent,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";
import { useTranslation } from "react-i18next";

type AIModel = {
  id: string;
  provider: string;
  capabilities: {
    toolCalling: boolean;
    webSearch: boolean;
    generalChat: boolean;
    storeData: boolean;
    listWriter?: boolean;
  };
  priority: number;
};

export type ThreadGroupPart = MessagePrimitive.GroupedParts.GroupPart;

/**
 * Optional component overrides for the thread. `AssistantMessage` and
 * `Welcome` replace whole sections; the remaining slots override how the
 * assistant message renders tool calls and part groups. Tool UIs registered
 * by name (toolkit `render`, `useAssistantDataUI`) take precedence over
 * `ToolFallback`.
 */
export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
  ToolGroup?:
    | ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>>
    | undefined;
  ReasoningGroup?:
    | ComponentType<PropsWithChildren<{ group: ThreadGroupPart }>>
    | undefined;
};

export type ThreadProps = {
  components?: ThreadComponents | undefined;
};

const EMPTY_COMPONENTS: ThreadComponents = {};

const ThreadComponentsContext =
  createContext<ThreadComponents>(EMPTY_COMPONENTS);

// Startup exposes a loading placeholder thread; treat it as a new chat so
// the composer mounts centered. Loads after startup keep the docked layout.
const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

export const Thread: FC<ThreadProps> = ({ components = EMPTY_COMPONENTS }) => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot isEmpty={isEmpty} />
    </ThreadComponentsContext.Provider>
  );
};

const ThreadRoot: FC<{ isEmpty: boolean }> = ({ isEmpty }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-bg" as string]:
          "color-mix(in oklab, var(--color-muted) 30%, var(--color-background))",
        ["--composer-radius" as string]: "1.5rem",
        ["--composer-padding" as string]: "8px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4",
            isEmpty && "justify-center",
          )}
        >
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-14 flex flex-col gap-y-6 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              "aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6",
              !isEmpty &&
                "sticky bottom-0 mt-auto rounded-t-(--composer-radius)",
            )}
          >
            <ThreadScrollToBottom />
            <ThreadFollowupSuggestions />
            <Composer />
            <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  const isCancelled = useAuiState(
    (s) =>
      s.message.role === "assistant" &&
      s.message.status?.type === "incomplete" &&
      s.message.status.reason === "cancelled",
  );

  if (isEditing) return <EditComposer />;
  if (isCancelled) return null;
  if (role === "user") return <UserMessage />;
  return <AssistantMessageComponent />;
};

const ThreadScrollToBottom: FC = () => {
  const { t } = useTranslation();
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip={t("ai.scrollToBottom", "Scroll to bottom")}
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-[9999] self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
        {t("ai.welcomeTitle", "How can I help you today?")}
      </h1>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t(
          "ai.welcomeSubtitle",
          "Ask me anything about your store, products, sales, inventory, or more.",
        )}
      </p>
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  const { t } = useTranslation();
  const suggestions = [
    t("ai.suggestions.sales", "How much did I sell today?"),
    t("ai.suggestions.stock", "Which products are low on stock?"),
    t("ai.suggestions.profit", "What’s my profit today?"),
  ];

  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-1">
      {suggestions.map((prompt, index) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          method="replace"
          autoSend
          className={cn(
            "aui-thread-welcome-suggestion text-foreground hover:bg-muted/80 border-border/60",
            "h-auto rounded-full border bg-background/80 px-3.5 py-1.5 text-sm font-normal",
            "shadow-sm backdrop-blur-sm whitespace-nowrap transition-colors",
            "fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-300",
          )}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          {prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const Composer: FC = () => {
  const { t } = useTranslation();
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative z-0 flex w-full flex-col overflow-visible">
      {isEmpty && (
        <div
          aria-hidden="true"
          className="composer-welcome-glow pointer-events-none absolute inset-0 -z-10 rounded-(--composer-radius) opacity-90 blur-[8px] motion-reduce:animate-none"
        />
      )}
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))] dark:shadow-none"
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder={t("ai.placeholder", "Send a message...")}
            className="aui-composer-input caret-primary placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
            rows={1}
            autoFocus
            enterKeyHint="send"
            maxLength={MAX_AI_MESSAGE_CHARS}
            aria-label={t("ai.messageInput", "Message input")}
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  const { t } = useTranslation();
  const charCount = useAuiState((s) => s.composer.text.length);
  // Same gate as the login "dev admin" button: only unpackaged Vite/dev builds.
  const canChooseModel = import.meta.env.DEV && !import.meta.env.PROD;
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    if (!canChooseModel) return;

    const loadModels = async () => {
      try {
        const availableModels = await window.api.ai.getAvailableModels();
        setModels(availableModels);
      } catch (error) {
        console.error("Failed to load AI models:", error);
      }
    };

    loadModels();
  }, [canChooseModel]);

  const handleModelChange = async (modelId: string | null) => {
    if (!canChooseModel) return;
    try {
      await window.api.ai.setModel(modelId);
      setSelectedModel(modelId);
      setModelOpen(false);
    } catch (error) {
      console.error("Failed to select AI model:", error);
    }
  };

  const selectedModelData = models.find((model) => model.id === selectedModel);

  const selectedModelName = selectedModelData
    ? selectedModelData.provider === "google"
      ? `Google — ${selectedModelData.id}`
      : `${selectedModelData.provider} — ${selectedModelData.id}`
    : t("ai.automatic", "Automatic");

  return (
    <div className="aui-composer-action-wrapper flex w-full items-center justify-between">
      {/* LEFT SIDE */}
      <div className="flex min-w-0 items-center gap-1.5">
        {/* MODEL POPOVER — interactive in developer mode only */}
        <div className="relative">
          <button
            type="button"
            disabled={!canChooseModel}
            aria-disabled={!canChooseModel}
            onClick={() => {
              if (!canChooseModel) return;
              setModelOpen((open) => !open);
            }}
            className={cn(
              "flex h-7 max-w-[150px] items-center gap-1.5 rounded-full",
              "border border-border/50 bg-muted/40 px-2.5",
              "text-[10px] font-medium text-muted-foreground",
              "transition-all duration-200",
              canChooseModel &&
                "hover:bg-muted/70 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20",
              canChooseModel && modelOpen && "bg-muted/70 text-foreground",
              !canChooseModel && "disabled:pointer-events-none disabled:opacity-40",
            )}
            aria-label={t("ai.selectModel", "Select AI model")}
            aria-expanded={canChooseModel ? modelOpen : false}
            title={
              canChooseModel
                ? undefined
                : t("ai.modelDisabled", "Model selection is disabled")
            }
          >
            <span className="truncate">{selectedModelName}</span>
            <ChevronUpIcon
              className={cn(
                "size-3 shrink-0 transition-transform duration-200",
                canChooseModel && modelOpen && "rotate-180",
              )}
            />
          </button>

          {canChooseModel && modelOpen && (
            <>
              <button
                type="button"
                aria-label={t("ai.closeModelSelector", "Close model selector")}
                className="fixed inset-0 z-[9998] cursor-default"
                onClick={() => setModelOpen(false)}
              />

              <div
                className={cn(
                  "absolute bottom-full left-0 z-[9999] mb-2",
                  "w-[220px] overflow-hidden rounded-xl",
                  "border border-border/60 bg-popover/95",
                  "shadow-xl backdrop-blur-md",
                  "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
                  "duration-200",
                )}
              >
                <div className="border-b border-border/50 px-3 py-2">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {t("ai.modelHeading", "AI MODEL")}
                  </p>
                </div>

                <div className="max-h-[240px] overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => handleModelChange(null)}
                    className={cn(
                      "flex w-full items-center justify-between",
                      "rounded-lg px-2.5 py-2",
                      "text-left text-[11px]",
                      "transition-colors duration-150",
                      "hover:bg-muted",
                      !selectedModel && "bg-primary/10 text-primary",
                    )}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">
                        {t("ai.automatic", "Automatic")}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {t("ai.automaticHint", "Let REDA AI choose")}
                      </span>
                    </div>
                    {!selectedModel && (
                      <CheckIcon className="size-3.5 shrink-0" />
                    )}
                  </button>

                  {models.map((model) => {
                    const isSelected = selectedModel === model.id;
                    const displayName =
                      model.provider === "google"
                        ? `Google — ${model.id}`
                        : `${model.provider} — ${model.id}`;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleModelChange(model.id)}
                        className={cn(
                          "flex w-full items-center justify-between",
                          "rounded-lg px-2.5 py-2",
                          "text-left text-[11px]",
                          "transition-colors duration-150",
                          "hover:bg-muted",
                          isSelected && "bg-primary/10 text-primary",
                        )}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {displayName}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {model.capabilities.webSearch
                              ? t("ai.webSearch", "Web search available")
                              : t("ai.generalAi", "General AI")}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckIcon className="size-3.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {models.length === 0 && (
                    <div className="px-2.5 py-3 text-center text-[10px] text-muted-foreground">
                      {t("ai.noModels", "No models available")}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <AuiIf condition={(s) => s.thread.capabilities.dictation}>
          <AuiIf condition={(s) => s.composer.dictation == null}>
            <ComposerPrimitive.Dictate asChild>
              <TooltipIconButton
                tooltip={t("ai.voiceInput", "Voice input")}
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-dictate size-7 rounded-full"
                aria-label={t("ai.startVoice", "Start voice input")}
              >
                <MicIcon className="aui-composer-dictate-icon size-4" />
              </TooltipIconButton>
            </ComposerPrimitive.Dictate>
          </AuiIf>

          <AuiIf condition={(s) => s.composer.dictation != null}>
            <ComposerPrimitive.StopDictation asChild>
              <TooltipIconButton
                tooltip={t("ai.stopDictation", "Stop dictation")}
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-stop-dictation text-destructive size-7 rounded-full"
                aria-label={t("ai.stopDictation", "Stop dictation")}
              >
                <SquareIcon className="aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" />
              </TooltipIconButton>
            </ComposerPrimitive.StopDictation>
          </AuiIf>
        </AuiIf>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "tabular-nums text-xs font-medium",
            charCount >= MAX_AI_MESSAGE_CHARS
              ? "text-destructive"
              : charCount >= MAX_AI_MESSAGE_CHARS * 0.85
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
          aria-live="polite"
          aria-label={t("ai.charCountLabel", "{{count}} of {{max}} characters", {
            count: charCount,
            max: MAX_AI_MESSAGE_CHARS,
          })}
        >
          {charCount}/{MAX_AI_MESSAGE_CHARS}
        </span>
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip={t("ai.send", "Send message")}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-7 rounded-full"
              aria-label={t("ai.send", "Send message")}
            >
              <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>

        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-7 rounded-full"
              aria-label={t("ai.stopGenerating", "Stop generating")}
            >
              <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  const {
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    ReasoningGroup,
  } = useContext(ThreadComponentsContext);

  const ACTION_BAR_PT = "pt-1.5";
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative flex -mb-7.5 flex-col items-start pb-7.5 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="w-fit max-w-[85%] min-w-0 text-foreground px-2 leading-relaxed wrap-break-word"
      >
        <WorkingStatus />
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ["group-chainOfThought", "group-reasoning"],
            "tool-call": ["group-chainOfThought", "group-tool"],
            "standalone-tool-call": [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case "group-tool":
                if (ToolGroup) {
                  return <ToolGroup group={part}>{children}</ToolGroup>;
                }
                return (
                  <ToolGroupRoot variant="ghost">
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === "running"}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case "group-reasoning": {
                if (ReasoningGroup) {
                  return (
                    <ReasoningGroup group={part}>{children}</ReasoningGroup>
                  );
                }
                const running = part.status.type === "running";
                return (
                  <ReasoningRoot streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <Reasoning {...part} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallbackComponent {...part} />;
              case "data":
                return part.dataRendererUI;
              case "file":
                return (
                  <div data-slot="aui_assistant-message-file" className="py-1">
                    <File {...part} />
                  </div>
                );
              case "image":
                return (
                  <div data-slot="aui_assistant-message-image" className="py-1">
                    <Image {...part} />
                  </div>
                );
              case "indicator":
                return null;
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("ms-2 flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  const { t } = useTranslation();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t("common.copy", "Copy")}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip={t("common.refresh", "Refresh")}>
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip={t("ai.more", "More")}
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="aui-action-bar-more-content bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[9999] min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
              <DownloadIcon className="size-4" />
              {t("ai.exportMarkdown", "Export as Markdown")}
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserText: TextMessagePartComponent = ({ text }) => (
  <BidiText className="whitespace-pre-wrap">{text}</BidiText>
);

const UserFilePart: FileMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <File {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <Image {...part} />
  </div>
);

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer rounded-xl bg-muted-foreground/7 px-4 py-2 text-foreground wrap-break-word empty:hidden dark:bg-muted-foreground/25">
          <MessagePrimitive.Parts
            components={{
              Text: UserText,
              File: UserFilePart,
              Image: UserImagePart,
            }}
          />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  const { t } = useTranslation();
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip={t("ai.edit", "Edit")} className="aui-user-action-edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const { t } = useTranslation();
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 ms-auto flex w-full max-w-[85%] flex-col rounded-(--composer-radius) border bg-(--composer-bg) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
          autoFocus
          maxLength={MAX_AI_MESSAGE_CHARS}
          aria-label={t("ai.messageInput", "Message input")}
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3.5"
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 rounded-full px-3.5">
              {t("ai.update", "Update")}
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  const { t } = useTranslation();
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip={t("ai.previous", "Previous")}>
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip={t("ai.next", "Next")}>
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
