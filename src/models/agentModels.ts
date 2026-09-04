export interface AgentRunEvent { runId:string; eventId:string; eventType:string; component:string; message:string; status:"Running"|"Completed"|"Failed"; durationMilliseconds?:number; timestamp:string; }
export interface PromptResponse { runId:string; response:string; durationMilliseconds:number; successful:boolean; }
export interface ChatMessage { role:"user"|"assistant"; content:string; }
export interface LabelSectionContent { key:string; displayName:string; content:string; }
export interface LabelCandidate { id:string; strategy:string; summary:string; sections:LabelSectionContent[]; assumptions:string[]; reviewFlags:string[]; }
