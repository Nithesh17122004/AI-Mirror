"use client";

import { useState } from "react";
import { Eraser, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  StylistRecommendationCard,
  type StylistCardRecommendation,
} from "./recommendation-card";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: StylistCardRecommendation[];
};

type ChatError = {
  message: string;
  retryable: boolean;
};

const SUGGESTIONS = [
  "A formal shirt under ₹1,500",
  "A red dress for a festive dinner",
  "Jeans for the weekend in my size M",
  "A saree for a wedding",
  "A white kurta in stock",
];

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function StylistChat({
  providerMode,
  providerName,
}: {
  providerMode: "demo" | "real";
  providerName: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<ChatError | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history: ChatTurn[] = [...turns, { id: nextId(), role: "user", content: trimmed }];
    setTurns(history);
    setDraft("");
    setBusy(true);
    setChatError(null);

    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversation: history.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const payload = (await res.json()) as {
        success: boolean;
        result?: {
          message: string;
          recommendations?: StylistCardRecommendation[];
        };
        error?: { message: string; retryable: boolean };
      };

      if (!res.ok || !payload.success || !payload.result) {
        setChatError({
          message:
            payload.error?.message ??
            "I couldn't style that right now. Please try again.",
          retryable: payload.error?.retryable ?? true,
        });
        setTurns((prev) => prev.filter((t) => t.id !== history[history.length - 1].id));
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: payload.result?.message ?? "",
          recommendations: payload.result?.recommendations ?? [],
        },
      ]);
    } catch {
      setChatError({
        message: "Couldn't reach the styling service. Please try again.",
        retryable: true,
      });
      setTurns((prev) => prev.filter((t) => t.id !== history[history.length - 1].id));
    } finally {
      setBusy(false);
    }
  }

  function clearConversation() {
    setTurns([]);
    setChatError(null);
    setDraft("");
  }

  return (
    <Card className="flex h-[min(70vh,620px)] flex-col overflow-hidden">
      <div
        role="log"
        aria-live="polite"
        aria-label="Stylist conversation"
        className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {turns.length === 0 && !busy && (
          <div className="flex h-full flex-col items-start justify-center gap-4 px-1">
            <div className="flex items-center gap-2 text-brass-600">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-espresso-700">
                Tell I-RIS what you&apos;re looking for
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className="rounded-full border border-espresso-900/15 bg-ivory-50 px-3.5 py-1.5 text-[13px] text-espresso-700 transition-colors hover:border-brass-500/50 hover:bg-ivory-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={cn(
              "flex w-full",
              turn.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] sm:max-w-[80%]",
                turn.role === "assistant" && "w-full max-w-[85%] sm:max-w-xl"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-[14px] leading-6",
                  turn.role === "user"
                    ? "rounded-br-md bg-espresso-900 text-ivory-50"
                    : "rounded-bl-md bg-ivory-100 text-espresso-800"
                )}
              >
                {turn.content}
              </div>
              {turn.recommendations && turn.recommendations.length > 0 && (
                <div className="mt-4 space-y-5">
                  {turn.recommendations.map((rec) => (
                    <StylistRecommendationCard
                      key={rec.product.id}
                      recommendation={rec}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-ivory-100 px-4 py-3"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-brass-600"
              />
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-brass-600 [animation-delay:150ms]"
              />
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-brass-600 [animation-delay:300ms]"
              />
              <span className="text-[13px] font-medium text-espresso-700">
                Styling your look…
              </span>
            </div>
          </div>
        )}

        {chatError && (
          <div
            role="alert"
            className="rounded-xl border border-rosewood-600/25 bg-rosewood-600/5 px-4 py-3 text-[13px] leading-6 text-rosewood-700"
          >
            {chatError.message}
            {chatError.retryable && (
              <button
                type="button"
                className="ml-2 font-semibold underline-offset-4 hover:underline"
                onClick={() => send(draft)}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-espresso-900/10 bg-ivory-50/70 px-4 py-3 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="stylist-message" className="sr-only">
            Message the stylist
          </label>
          <textarea
            id="stylist-message"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder="E.g. A navy kurta under ₹2,000 in my size"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-espresso-900/15 bg-white px-4 py-2.5 text-sm text-espresso-900 placeholder:text-espresso-400 focus:border-brass-500 focus:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-espresso-500">
            {providerMode === "demo"
              ? "Demo mode — simulated responses, recommendations always come from the real catalogue."
              : `Live stylist (${providerName}) — recommendations always verified against the real catalogue.`}
          </p>
          <button
            type="button"
            onClick={clearConversation}
            disabled={turns.length === 0}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-espresso-500 transition-colors hover:text-espresso-900 disabled:pointer-events-none disabled:opacity-40"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            Clear conversation
          </button>
        </div>
      </div>
    </Card>
  );
}