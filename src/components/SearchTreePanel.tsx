import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, GitBranch, Trophy } from "lucide-react"
import type { AgentRunEvent, BeamSearchResponse, SearchNode } from "../models/agentModels"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const styles: Record<string, string> = {
  Retained: "border-emerald-300 bg-emerald-50",
  Pruned: "border-slate-300 bg-slate-50 opacity-70",
  ComplianceFailed: "border-red-300 bg-red-50",
  Finalist: "border-violet-300 bg-violet-50",
  Winner: "border-amber-400 bg-amber-50 ring-2 ring-amber-200",
}

function parseResult(events: AgentRunEvent[]): BeamSearchResponse | null {
  const event = [...events].reverse().find(
    (item) => item.eventType === "BeamSearchCompleted",
  )
  if (!event) return null
  try {
    return JSON.parse(event.message) as BeamSearchResponse
  } catch {
    return null
  }
}

function NodeCard({ node }: { node: SearchNode }) {
  return (
    <Card className={`shadow-none ${styles[node.status] ?? ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Candidate {node.candidateId}</CardTitle>
          <Badge variant="outline">{node.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Overall</span><strong>{node.evaluation.overallScore}</strong></div>
        <div className="flex justify-between"><span>Compliance</span><strong>{node.evaluation.compliance}</strong></div>
        <p className="text-xs leading-5 text-slate-600">{node.decisionReason}</p>
      </CardContent>
    </Card>
  )
}

export function SearchTreePanel({ events }: { events: AgentRunEvent[] }) {
  const result = useMemo(() => parseResult(events), [events])

  if (!result) {
    return (
      <div className="flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <GitBranch className="h-8 w-8 text-violet-600" />
        <h3 className="mt-4 font-semibold">No search tree yet</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Run full label optimization to visualize retained, pruned, expanded,
          and winning branches.
        </p>
      </div>
    )
  }

  const roots = result.nodes.filter((node) => node.depth === 0)
  const children = result.nodes.filter((node) => node.depth === 1)

  return (
    <ScrollArea className="h-[calc(100vh-230px)] min-h-[500px] pr-3">
      <div className="space-y-5 pb-5">
        {result.winner ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-700" />
                <CardTitle className="text-base">
                  Winner: Candidate {result.winner.candidateId}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{result.winner.decisionReason}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>Overall {result.winner.evaluation.overallScore}</Badge>
                <Badge variant="outline">Compliance {result.winner.evaluation.compliance}</Badge>
                <Badge variant="outline">Parent {result.winner.parentCandidateId}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Human approval required
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-300 bg-red-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-700" />
                <CardTitle className="text-base text-red-900">
                  No compliance-qualified winner
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-red-800">
              <p>
                None of the expanded candidates reached the compliance threshold
                of {result.complianceThreshold}.
              </p>
              <p>
                The system did not override the compliance gate or select a
                failed candidate as a fallback.
              </p>
              <Badge variant="outline" className="border-red-300 text-red-800">
                Human review required
              </Badge>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold">Initial candidates</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {roots.map((node) => <NodeCard key={node.candidateId} node={node} />)}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Expanded branches</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {children.map((node) => <NodeCard key={node.candidateId} node={node} />)}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Audit trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-600">
              {result.auditTrail.map((entry, index) => <li key={index}>{entry}</li>)}
            </ol>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
