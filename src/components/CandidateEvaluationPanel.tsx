import { useMemo } from "react"
import { AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react"
import type { AgentRunEvent, CandidateEvaluation } from "../models/agentModels"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"

function normalizeEvaluation(value: unknown): CandidateEvaluation | null {
  if (typeof value !== "object" || value === null) return null
  const item = value as Record<string, unknown>
  const strings = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0
  const candidateId = typeof item.candidateId === "string" ? item.candidateId : "?"
  return {
    candidateId,
    compliance: number(item.compliance),
    readability: number(item.readability),
    brandAlignment: number(item.brandAlignment),
    consumerClarity: number(item.consumerClarity),
    overallScore: number(item.overallScore),
    strengths: strings(item.strengths),
    risks: strings(item.risks),
    rationaleSummary: typeof item.rationaleSummary === "string" ? item.rationaleSummary : "",
  }
}

export function CandidateEvaluationPanel({ events }: { events: AgentRunEvent[] }) {
  const evaluations = useMemo(() => events
    .filter((event) => event.eventType === "CandidateEvaluated")
    .flatMap((event) => {
      try { const value = normalizeEvaluation(JSON.parse(event.message)); return value ? [value] : [] }
      catch { return [] }
    }), [events])

  if (!evaluations.length) return <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><BarChart3 className="h-8 w-8 text-blue-600"/><h3 className="mt-4 font-semibold">No evaluations yet</h3><p className="mt-2 max-w-sm text-sm text-slate-500">Generate label candidates to see independent Phase 3 scores. No winner is selected.</p></div>

  return <ScrollArea className="h-[calc(100vh-230px)] min-h-[500px] pr-3"><div className="space-y-4 pb-4">{evaluations.map((evaluation) => <Card key={evaluation.candidateId} className="shadow-none"><CardHeader><div className="flex items-center justify-between"><CardTitle>Candidate {evaluation.candidateId}</CardTitle><Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Overall {evaluation.overallScore}</Badge></div><p className="text-sm leading-6 text-slate-500">{evaluation.rationaleSummary}</p></CardHeader><CardContent className="space-y-5"><Score label="Compliance" value={evaluation.compliance}/><Score label="Readability" value={evaluation.readability}/><Score label="Brand alignment" value={evaluation.brandAlignment}/><Score label="Consumer clarity" value={evaluation.consumerClarity}/><div className="grid gap-3 xl:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h4 className="flex items-center gap-2 font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Strengths</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800">{evaluation.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="flex items-center gap-2 font-medium text-amber-800"><AlertTriangle className="h-4 w-4"/>Risks</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{evaluation.risks.map((x,i)=><li key={i}>{x}</li>)}</ul></div></div></CardContent></Card>)}</div></ScrollArea>
}
function Score({label,value}:{label:string;value:number}) { return <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{label}</span><span>{value}/100</span></div><Progress value={value} className="h-2"/></div> }
