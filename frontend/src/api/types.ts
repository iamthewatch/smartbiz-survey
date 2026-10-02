export type QuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'DROPDOWN'
  | 'RATING'
  | 'SCALE'
  | 'YES_NO'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE'

export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export interface UserInfo {
  id: number
  username: string
  fullName?: string
  role: string
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: UserInfo
}

export interface OptionDto {
  id: number | null
  label: string
}

export interface QuestionDto {
  id: number | null
  type: QuestionType
  title: string
  description?: string | null
  required: boolean
  allowOther: boolean
  placeholder?: string | null
  minValue?: number | null
  maxValue?: number | null
  minLabel?: string | null
  maxLabel?: string | null
  minSelections?: number | null
  maxSelections?: number | null
  options: OptionDto[]
}

export interface SurveySummary {
  id: number
  title: string
  description?: string
  status: SurveyStatus
  slug: string
  accentColor?: string
  publicLinkEnabled: boolean
  questionCount: number
  responseCount: number
  invitationCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface SurveyDetail {
  id: number
  title: string
  description?: string | null
  status: SurveyStatus
  slug: string
  accentColor?: string | null
  welcomeMessage?: string | null
  thankYouMessage?: string | null
  publicLinkEnabled: boolean
  collectContact: boolean
  oneQuestionPerPage: boolean
  version: number
  responseCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  closedAt?: string
  questions: QuestionDto[]
}

export interface UpdateSurveyRequest {
  title: string
  description?: string | null
  accentColor?: string | null
  welcomeMessage?: string | null
  thankYouMessage?: string | null
  publicLinkEnabled: boolean
  collectContact: boolean
  oneQuestionPerPage: boolean
  version?: number
  questions: QuestionDto[]
}

export interface TemplateInfo {
  key: string
  title: string
  description?: string
  questionCount: number
}

export type LeadSource = 'MANUAL' | 'IMPORT' | 'PUBLIC_LINK'

export interface Lead {
  id: number
  fullName: string
  email?: string
  phone?: string
  company?: string
  note?: string
  source: LeadSource
  createdAt: string
  responseCount: number
}

export interface LeadRequest {
  fullName: string
  email?: string
  phone?: string
  company?: string
  note?: string
}

export interface LeadBrief {
  id: number
  fullName: string
  email?: string
  phone?: string
  company?: string
}

export type InvitationStatus = 'SENT' | 'OPENED' | 'COMPLETED'

export interface Invitation {
  id: number
  token: string
  status: InvitationStatus
  createdAt: string
  openedAt?: string
  completedAt?: string
  lead: LeadBrief
}

export interface LeadDetail {
  lead: Lead
  invitations: {
    id: number
    surveyId: number
    surveyTitle: string
    token: string
    status: InvitationStatus
    createdAt: string
    openedAt?: string
    completedAt?: string
  }[]
  responses: {
    id: number
    surveyId: number
    surveyTitle: string
    submittedAt: string
    durationSeconds?: number
  }[]
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export interface DayCount {
  date: string
  count: number
}

export interface OptionStat {
  optionId: number
  label: string
  count: number
  percent: number
}

export interface TextAnswer {
  responseId: number
  leadName?: string
  text: string
  submittedAt: string
}

export interface NumericStat {
  average?: number
  min?: number
  max?: number
  median?: number
  distribution: { value: number; count: number }[]
  nps?: number
}

export interface QuestionStat {
  questionId: number
  position: number
  type: QuestionType
  title: string
  answered: number
  skipped: number
  options?: OptionStat[]
  otherCount: number
  otherAnswers?: TextAnswer[]
  numeric?: NumericStat
  textAnswers?: TextAnswer[]
}

export interface SurveyAnalytics {
  surveyId: number
  title: string
  status: SurveyStatus
  lead?: LeadBrief
  totals: {
    responses: number
    invitations: number
    opened: number
    completed: number
    completionRate: number
    avgDurationSeconds?: number
  }
  timeline: DayCount[]
  questions: QuestionStat[]
}

export interface ResponseListItem {
  id: number
  lead?: LeadBrief
  submittedAt: string
  durationSeconds?: number
  answeredCount: number
}

export interface AnswerView {
  questionId: number
  position: number
  type: QuestionType
  title: string
  answered: boolean
  selectedOptions: string[]
  otherText?: string
  textValue?: string
  numberValue?: number
  maxValue?: number
  display: string
}

export interface ResponseDetail {
  id: number
  surveyId: number
  surveyTitle: string
  lead?: LeadBrief
  startedAt?: string
  submittedAt: string
  durationSeconds?: number
  answers: AnswerView[]
}

export interface Dashboard {
  surveys: number
  publishedSurveys: number
  draftSurveys: number
  leads: number
  responses: number
  responsesLast7Days: number
  invitations: number
  completionRate: number
  timeline: DayCount[]
  recentResponses: { id: number; surveyId: number; surveyTitle: string; leadName?: string; submittedAt: string }[]
  topSurveys: { id: number; title: string; status: SurveyStatus; responses: number }[]
}

export interface PublicSurvey {
  title: string
  description?: string
  accentColor?: string
  welcomeMessage?: string
  thankYouMessage?: string
  collectContact: boolean
  oneQuestionPerPage: boolean
  respondentName?: string
  questions: QuestionDto[]
}

export interface AnswerInput {
  questionId: number
  optionIds?: number[]
  otherText?: string
  textValue?: string
  numberValue?: number
}

export interface SubmitRequest {
  startedAt?: string
  contact?: { fullName?: string; email?: string; phone?: string }
  answers: AnswerInput[]
}

export interface ApiError {
  status: number
  code: string
  message: string
  details?: Record<string, string>
}
