import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileSearch,
  Gauge,
  MessageSquareText,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  Workflow,
  XCircle,
} from "lucide-react"

import { OrchestratorClient } from "./api/orchestratorClient"
import type { AgentRunEvent, ChatMessage } from "./models/agentModels"
import { LabelCandidatesPanel } from "./components/LabelCandidatesPanel"
import { CandidateEvaluationPanel } from "./components/CandidateEvaluationPanel"
import { SearchTreePanel } from "./components/SearchTreePanel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Welcome to the Label Creation Platform. Ask about a product, a regulatory requirement, or combine both in one request.",
  },
]

function formatDuration(milliseconds?: number | null): string {
  if (milliseconds === undefined || milliseconds === null) return "--"
  if (milliseconds < 1000) return `${milliseconds} ms`
  return `${(milliseconds / 1000).toFixed(2)}s`
}

function getEventDisplayName(event: AgentRunEvent): string {
  switch (event.eventType) {
    case "RunStarted":
      return "Prompt received"
    case "OrchestratorStarted":
      return "Orchestrator analyzing request"
    case "AgentStarted":
      return `${event.component} started`
    case "AgentCompleted":
      return `${event.component} completed`
    case "AgentFailed":
      return `${event.component} failed`
    case "OrchestratorCompleted":
      return "Orchestrator synthesized response"
    case "RunCompleted":
      return "Run completed"
    case "GenerationStarted":
      return "Label generation started"
    case "LabelCandidateGenerated":
      return `${event.component} generated`
    case "GenerationCompleted":
      return "Label generation completed"
    case "EvaluationStarted":
      return "Candidate evaluation started"
    case "CandidateEvaluated":
      return `${event.component} evaluated`
    case "EvaluationCompleted":
      return "Candidate evaluation completed"
    case "BeamSearchStarted":
      return "Beam search started"
    case "SearchNodeUpdated":
      return `${event.component} updated`
    case "BeamSearchCompleted":
      return "Beam search completed"
    case "WinnerSelected":
      return "Winner selected for human review"
    case "RunFailed":
      return "Run failed"
    default:
      return event.component
  }
}

function getEventIcon(event: AgentRunEvent) {
  const component = event.component.toLowerCase()
  if (event.status.toLowerCase() === "failed") return XCircle
  if (component.includes("product")) return Database
  if (component.includes("regulatory")) return ShieldCheck
  if (component.includes("evaluation")) return Gauge
  if (component.includes("generation") || component.includes("candidate")) return Sparkles
  if (event.eventType.includes("Orchestrator")) return Workflow
  if (event.eventType === "RunCompleted") return Sparkles
  return Activity
}

function getEventTheme(event: AgentRunEvent): string {
  const component = event.component.toLowerCase()
  if (event.status.toLowerCase() === "failed") return "bg-red-50 text-red-700 ring-red-200"
  if (component.includes("product")) return "bg-cyan-50 text-cyan-700 ring-cyan-200"
  if (component.includes("regulatory")) return "bg-amber-50 text-amber-700 ring-amber-200"
  if (component.includes("evaluation")) return "bg-blue-50 text-blue-700 ring-blue-200"
  if (component.includes("generation") || component.includes("candidate")) return "bg-violet-50 text-violet-700 ring-violet-200"
  if (event.eventType.includes("Orchestrator")) return "bg-indigo-50 text-indigo-700 ring-indigo-200"
  return "bg-violet-50 text-violet-700 ring-violet-200"
}

function EventStatusIcon({ event }: { event: AgentRunEvent }) {
  const status = event.status.toLowerCase()
  if (status === "failed") return <XCircle className="h-5 w-5 text-red-500" />
  if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  return <Activity className="h-5 w-5 animate-pulse text-indigo-500" />
}

function TraceRow({ event }: { event: AgentRunEvent }) {
  const [open, setOpen] = useState(true)
  const Icon = getEventIcon(event)
  const hasMetadata = Boolean(event.eventType || event.timestamp)

  return (
    <div className="relative pl-8">
      <div className="absolute bottom-[-18px] left-[11px] top-8 w-px bg-slate-200 last:hidden" />
      <div className="absolute left-0 top-1.5 rounded-full bg-white ring-4 ring-white">
        <EventStatusIcon event={event} />
      </div>

      <button
        type="button"
        onClick={() => hasMetadata && setOpen((value) => !value)}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`rounded-xl p-2 ring-1 ${getEventTheme(event)}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {getEventDisplayName(event)}
                </span>
                {hasMetadata &&
                  (open ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ))}
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">{event.message}</p>
            </div>
          </div>

          {event.durationMilliseconds !== undefined && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDuration(event.durationMilliseconds)}
            </div>
          )}
        </div>
      </button>

      {open && hasMetadata && (
        <div className="ml-5 border-l border-dashed border-slate-300 py-2 pl-4">
          <div className="flex flex-wrap items-center gap-2 py-1 text-xs text-slate-500">
            <Badge variant="secondary" className="rounded-full font-normal">
              {event.eventType}
            </Badge>
            <Badge
              variant="outline"
              className={`rounded-full font-normal ${
                event.status.toLowerCase() === "failed"
                  ? "border-red-200 text-red-700"
                  : event.status.toLowerCase() === "completed"
                    ? "border-emerald-200 text-emerald-700"
                    : "border-indigo-200 text-indigo-700"
              }`}
            >
              {event.status}
            </Badge>
            {event.timestamp && (
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const clientRef = useRef<OrchestratorClient | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const traceEndRef = useRef<HTMLDivElement | null>(null)

  const [prompt, setPrompt] = useState(
    "For SKU 12345, what compliant structure/function claims could be considered based on its formulation?",
  )
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [events, setEvents] = useState<AgentRunEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [lastRunDuration, setLastRunDuration] = useState<number | null>(null)

  useEffect(() => {
    const client = new OrchestratorClient()
    clientRef.current = client
    let disposed = false

    client
      .connect((event: AgentRunEvent) => {
        if (disposed) return
        setEvents((current) => [...current, event])
        setCurrentRunId(event.runId)
      })
      .then(() => {
        if (disposed) return
        setConnected(true)
        setError(null)
      })
      .catch((connectionError: unknown) => {
        if (disposed) return
        setConnected(false)
        setError(
          connectionError instanceof Error
            ? connectionError.message
            : "Unable to connect to the orchestrator.",
        )
      })

    return () => {
      disposed = true
      void client.disconnect()
    }
  }, [])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, running])
  useEffect(() => {
    traceEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [events, running])

  const specialistAgentCalls = useMemo(
    () => events.filter((event) => event.eventType === "AgentStarted").length,
    [events],
  )
  const completedSteps = useMemo(
    () => events.filter((event) => event.status.toLowerCase() === "completed").length,
    [events],
  )
  const failedSteps = useMemo(
    () => events.filter((event) => event.status.toLowerCase() === "failed").length,
    [events],
  )
  const successRate = useMemo(() => {
    if (completedSteps + failedSteps === 0) return 0
    return Math.round((completedSteps / (completedSteps + failedSteps)) * 100)
  }, [completedSteps, failedSteps])

  const runPrompt = async (): Promise<void> => {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || running || !clientRef.current) return

    if (!connected) {
      setError("The application is not connected to the orchestrator.")
      return
    }

    setMessages((current) => [...current, { role: "user", content: submittedPrompt }])
    setPrompt("")
    setEvents([])
    setCurrentRunId(null)
    setLastRunDuration(null)
    setRunning(true)
    setError(null)

    try {
      const result = await clientRef.current.runPrompt(submittedPrompt)
      setCurrentRunId(result.runId)
      setLastRunDuration(result.durationMilliseconds)
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.response },
      ])
      if (!result.successful) {
        setError("The orchestrator returned an unsuccessful result.")
      }
    } catch (runError: unknown) {
      const message =
        runError instanceof Error ? runError.message : "The prompt could not be completed."
      setError(message)
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "The request could not be completed. Review the error and execution trace for additional details.",
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  const startNewSession = async (): Promise<void> => {
    if (running || !clientRef.current) {
      return;
    }

    if (!connected) {
      setError(
        "The application is not connected to the orchestrator.",
      );

      return;
    }

    try {
      setError(null);

      await clientRef.current.resetConversation();

      setMessages(initialMessages);
      setEvents([]);
      setCurrentRunId(null);
      setLastRunDuration(null);
      setPrompt("");
    } catch (resetError: unknown) {
      const message =
        resetError instanceof Error
          ? resetError.message
          : "The conversation could not be reset.";

      setError(message);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f7fb] text-slate-900">
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 text-white shadow-lg shadow-indigo-200">
              <Workflow className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Label Platform Agent Console</h1>
              <p className="text-xs text-slate-500">
                Product intelligence, regulatory orchestration, generation, and evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`gap-1.5 rounded-full px-3 py-1.5 ${
                connected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {connected ? "Connected" : "Disconnected"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewSession}
              disabled={running}
              className="rounded-xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              New session
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-hidden p-4 sm:p-5">
        {error && (
          <Alert variant="destructive" className="mb-5 shrink-0 rounded-2xl bg-white">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>Request error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(400px,.88fr)]">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquareText className="h-5 w-5 text-indigo-600" />
                    Conversation
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ask product, regulatory, label-generation, or evaluation questions
                  </CardDescription>
                </div>
                {currentRunId && (
                  <Badge variant="secondary" className="max-w-[180px] truncate rounded-full" title={currentRunId}>
                    {currentRunId}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 p-6">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <Bot className="h-5 w-5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.role === "user"
                            ? "rounded-br-md bg-slate-900 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                        }`}
                      >
                        {message.content}
                      </div>

                      {message.role === "user" && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {running && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                        <span className="inline-flex items-center gap-2">
                          <Activity className="h-4 w-4 animate-pulse text-indigo-600" />
                          Processing request and coordinating agents...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t border-slate-100 bg-white p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void runPrompt()
                      }
                    }}
                    placeholder="Ask about a product, regulatory requirement, or generate and evaluate label candidates..."
                    disabled={running}
                    className="min-h-[88px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-xs text-slate-400">
                      Enter to send · Shift+Enter for a new line
                    </span>
                    <Button
                      onClick={() => void runPrompt()}
                      disabled={running || !connected || !prompt.trim()}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                    >
                      {running ? (
                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {running ? "Running" : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full min-h-0 overflow-hidden rounded-3xl border-slate-200 shadow-sm">
            <Tabs defaultValue="trace" className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-slate-100 px-5 pt-4">
                <TabsList className="grid w-full grid-cols-5 rounded-xl bg-slate-100">
                  <TabsTrigger value="trace" className="rounded-lg">
                    Execution trace
                  </TabsTrigger>
                  <TabsTrigger value="candidates" className="rounded-lg">
                    Label candidates
                  </TabsTrigger>
                  <TabsTrigger value="evaluation" className="rounded-lg">
                    Evaluation
                  </TabsTrigger>
                  <TabsTrigger value="search" className="rounded-lg">
                    Search tree
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="rounded-lg">
                    Run metrics
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="trace" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Agent activity</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Live orchestration and specialist-agent execution
                    </p>
                  </div>
                  {events.length > 0 && (
                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {completedSteps} completed
                    </Badge>
                  )}
                </div>

                <ScrollArea className="min-h-0 flex-1 pr-3">
                  {events.length === 0 && !running ? (
                    <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <Play className="h-7 w-7 text-indigo-500" />
                      </div>
                      <h3 className="mt-4 font-semibold">No execution yet</h3>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                        Submit a prompt to inspect routing decisions, specialist-agent calls, status, and duration.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {events.map((event) => (
                        <TraceRow key={event.eventId} event={event} />
                      ))}

                      {running && (
                        <div className="ml-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                          <div className="flex items-center gap-3 text-sm font-medium text-indigo-700">
                            <Activity className="h-4 w-4 animate-spin" />
                            Waiting for the next execution event
                          </div>
                          <Progress value={62} className="mt-3 h-1.5" />
                        </div>
                      )}
                      <div ref={traceEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="candidates" className="m-0 min-h-0 flex-1 overflow-hidden p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Generated alternatives</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Generated content candidates for review
                  </p>
                </div>
                <LabelCandidatesPanel events={events} />
              </TabsContent>

              <TabsContent value="evaluation" className="m-0 min-h-0 flex-1 overflow-hidden p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Candidate evaluation</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Independent weighted scores. Phase 3 does not select a winner.
                  </p>
                </div>
                <CandidateEvaluationPanel events={events} />
              </TabsContent>

              <TabsContent value="search" className="m-0 min-h-0 flex-1 overflow-hidden p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Tree of Thoughts and Beam Search</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Retained, pruned, expanded, and winning branches</p>
                </div>
                <SearchTreePanel events={events} />
              </TabsContent>

              <TabsContent value="metrics" className="m-0 min-h-0 flex-1 overflow-hidden p-5">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Timer} color="text-indigo-600" value={running ? "Running" : formatDuration(lastRunDuration)} label="Total duration" />
                  <MetricCard icon={Bot} color="text-cyan-600" value={specialistAgentCalls.toString()} label="Specialist calls" />
                  <MetricCard icon={Gauge} color="text-amber-600" value={events.length ? `${successRate}%` : "--"} label="Successful steps" />
                  <MetricCard icon={FileSearch} color="text-violet-600" value={events.length.toString()} label="Trace events" />
                </div>

                <Card className="mt-4 rounded-2xl border-slate-200 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Run status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Correlation ID</span>
                      <code className="max-w-[260px] truncate rounded bg-slate-100 px-2 py-1 text-xs" title={currentRunId ?? ""}>
                        {currentRunId ?? "Not started"}
                      </code>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Connection</span>
                      <span className={connected ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                        {connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Result</span>
                      {running ? (
                        <span className="flex items-center gap-1.5 text-indigo-600">
                          <Activity className="h-4 w-4 animate-spin" /> Running
                        </span>
                      ) : failedSteps > 0 ? (
                        <span className="flex items-center gap-1.5 text-red-600">
                          <XCircle className="h-4 w-4" /> Failed
                        </span>
                      ) : completedSteps > 0 ? (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> Completed
                        </span>
                      ) : (
                        <span className="text-slate-400">Not started</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: typeof Timer
  color: string
  value: string
  label: string
}) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-none">
      <CardContent className="p-4">
        <Icon className={`h-5 w-5 ${color}`} />
        <div className="mt-3 text-2xl font-bold">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </CardContent>
    </Card>
  )
}

export default App
