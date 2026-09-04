import { useMemo } from "react"
import {
  AlertTriangle,
  FlaskConical,
  Sparkles,
} from "lucide-react"

import type {
  AgentRunEvent,
  LabelCandidate,
  LabelSectionContent,
} from "../models/agentModels"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface CandidateParseFailure {
  eventId: string
  message: string
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  )
}

function normalizeSections(value: unknown): LabelSectionContent[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      key:
        typeof item.key === "string" && item.key.trim().length > 0
          ? item.key
          : `section-${index + 1}`,
      displayName:
        typeof item.displayName === "string" &&
        item.displayName.trim().length > 0
          ? item.displayName
          : `Section ${index + 1}`,
      content:
        typeof item.content === "string"
          ? item.content
          : "[REVIEW REQUIRED: no content was returned]",
    }))
}

function normalizeCandidate(
  value: unknown,
  fallbackId: string,
): LabelCandidate | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim().length > 0
        ? candidate.id
        : fallbackId,
    strategy:
      typeof candidate.strategy === "string" &&
      candidate.strategy.trim().length > 0
        ? candidate.strategy
        : "Unspecified strategy",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    sections: normalizeSections(candidate.sections),
    assumptions: normalizeStringArray(candidate.assumptions),
    reviewFlags: normalizeStringArray(candidate.reviewFlags),
  }
}

function parseCandidateEvent(
  event: AgentRunEvent,
  index: number,
): LabelCandidate | null {
  try {
    const parsed: unknown = JSON.parse(event.message)
    return normalizeCandidate(parsed, String.fromCharCode(65 + index))
  } catch {
    return null
  }
}

export function LabelCandidatesPanel({
  events,
}: {
  events: AgentRunEvent[]
}) {
  const { candidates, parseFailures } = useMemo(() => {
    const candidateEvents = events.filter(
      (event) => event.eventType === "LabelCandidateGenerated",
    )

    const parsedCandidates: LabelCandidate[] = []
    const failures: CandidateParseFailure[] = []

    candidateEvents.forEach((event, index) => {
      const candidate = parseCandidateEvent(event, index)

      if (candidate) {
        parsedCandidates.push(candidate)
      } else {
        failures.push({
          eventId: event.eventId,
          message: "A generated candidate could not be parsed.",
        })
      }
    })

    return {
      candidates: parsedCandidates,
      parseFailures: failures,
    }
  }, [events])

  if (candidates.length === 0 && parseFailures.length === 0) {
    return (
      <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <FlaskConical className="h-8 w-8 text-violet-500" />
        <h3 className="mt-4 font-semibold">No label candidates yet</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Ask the platform to generate or revise a label. Phase 2 displays
          three alternatives without ranking them.
        </p>
      </div>
    )
  }

  if (candidates.length === 0 && parseFailures.length > 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 font-semibold text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Candidate data could not be displayed
        </div>
        <p className="mt-2 text-sm leading-6 text-red-700">
          Candidate events were received, but their message payloads were not
          valid candidate JSON. Review the execution trace and browser console.
        </p>
      </div>
    )
  }

  const defaultCandidateId = candidates[0]?.id ?? "A"

  return (
    <ScrollArea className="h-[calc(100vh-230px)] min-h-[500px] pr-3">
      {parseFailures.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-sm text-amber-800">
              {parseFailures.length} candidate event could not be parsed. The
              valid candidates are displayed below.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultCandidateId}>
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.max(
              candidates.length,
              1,
            )}, minmax(0, 1fr))`,
          }}
        >
          {candidates.map((candidate, index) => (
            <TabsTrigger
              key={`${candidate.id}-${index}`}
              value={candidate.id}
            >
              Candidate {candidate.id}
            </TabsTrigger>
          ))}
        </TabsList>

        {candidates.map((candidate, candidateIndex) => (
          <TabsContent
            key={`${candidate.id}-${candidateIndex}`}
            value={candidate.id}
            className="space-y-4 pt-3"
          >
            <Card className="border-violet-200 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {candidate.strategy}
                    </CardTitle>
                    {candidate.summary && (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {candidate.summary}
                      </p>
                    )}
                  </div>
                  <Badge className="shrink-0 bg-violet-100 text-violet-700 hover:bg-violet-100">
                    Unranked
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {candidate.sections.length > 0 ? (
              candidate.sections.map((section, sectionIndex) => (
                <Card
                  key={`${section.key}-${sectionIndex}`}
                  className="shadow-none"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {section.displayName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {section.content}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-amber-200 bg-amber-50 shadow-none">
                <CardContent className="flex gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <p className="text-sm text-amber-800">
                    This candidate did not contain any label sections.
                  </p>
                </CardContent>
              </Card>
            )}

            {candidate.reviewFlags.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Review flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                    {candidate.reviewFlags.map((flag, index) => (
                      <li key={index}>{flag}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {candidate.assumptions.length > 0 && (
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Assumptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                    {candidate.assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </ScrollArea>
  )
}
