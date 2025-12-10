export enum AppTab {
  GENERATOR = 'GENERATOR',
  LIVE_COACH = 'LIVE_COACH',
  CHAT = 'CHAT'
}

export type ScriptDuration = '30s' | '45s' | '60s' | '90s';
export type ScriptTone = 'high_ticket' | 'formal_elegant' | 'medium' | 'informal';

export interface HookOption {
  type: string;
  text: string;
  visual: string;
}

export interface ScriptSectionOption {
  text: string;
  visual: string;
}

export interface ScriptBodyPoint {
  instruction: string;
  visual: string; // Added visual description for body steps
  reset?: string; // The visual/audio reset
}

export interface ScriptContent {
  relevanceOptions: ScriptSectionOption[]; // Changed from string[] to object with visual
  bodyOptions: ScriptBodyPoint[][]; // Array of 5 body variations
  ctaOptions: ScriptSectionOption[]; // Changed from string[] to object with visual
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}