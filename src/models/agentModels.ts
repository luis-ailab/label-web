export interface AgentRunEvent { runId:string; eventId:string; eventType:string; component:string; message:string; status:"Running"|"Completed"|"Failed"; durationMilliseconds?:number; timestamp:string; }
export interface PromptResponse { runId:string; response:string; durationMilliseconds:number; successful:boolean; }
export interface ChatMessage { role:"user"|"assistant"; content:string; }
export interface LabelSectionContent { key:string; displayName:string; content:string; }
export interface LabelCandidate { id:string; strategy:string; summary:string; sections:LabelSectionContent[]; assumptions:string[]; reviewFlags:string[]; }
export interface CandidateEvaluation { candidateId:string; compliance:number; readability:number; brandAlignment:number; consumerClarity:number; overallScore:number; strengths:string[]; risks:string[]; rationaleSummary:string; }
export interface SearchNode { candidateId:string; parentCandidateId?:string|null; depth:number; status:"Retained"|"Pruned"|"ComplianceFailed"|"Finalist"|"Winner"; candidate:LabelCandidate; evaluation:CandidateEvaluation; decisionReason:string; }
export interface BeamSearchResponse { searchId:string; beamWidth:number; childrenPerParent:number; complianceThreshold:number; nodes:SearchNode[]; winner:SearchNode|null; outcome:"WinnerSelected"|"NoQualifiedWinner"; auditTrail:string[]; completedAtUtc:string; algorithmVersion:string; humanApprovalRequired:boolean; }
