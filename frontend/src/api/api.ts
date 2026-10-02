import { http } from './client'
import type {
  Dashboard,
  Invitation,
  Lead,
  LeadDetail,
  LeadRequest,
  LoginResponse,
  Page,
  PublicSurvey,
  ResponseDetail,
  ResponseListItem,
  SubmitRequest,
  SurveyAnalytics,
  SurveyDetail,
  SurveyStatus,
  SurveySummary,
  TemplateInfo,
  UpdateSurveyRequest,
  UserInfo,
} from './types'

const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const authApi = {
  login: (username: string, password: string) =>
    d<LoginResponse>(http.post('/auth/login', { username, password })),
  me: () => d<UserInfo>(http.get('/auth/me')),
  changePassword: (currentPassword: string, newPassword: string) =>
    d<void>(http.post('/auth/change-password', { currentPassword, newPassword })),
}

export const surveyApi = {
  list: (params?: { status?: SurveyStatus; q?: string }) => d<SurveySummary[]>(http.get('/surveys', { params })),
  templates: () => d<TemplateInfo[]>(http.get('/surveys/templates')),
  create: (template?: string, title?: string) => d<SurveyDetail>(http.post('/surveys', { template, title })),
  get: (id: number) => d<SurveyDetail>(http.get(`/surveys/${id}`)),
  update: (id: number, body: UpdateSurveyRequest) => d<SurveyDetail>(http.put(`/surveys/${id}`, body)),
  publish: (id: number) => d<SurveyDetail>(http.post(`/surveys/${id}/publish`)),
  close: (id: number) => d<SurveyDetail>(http.post(`/surveys/${id}/close`)),
  toDraft: (id: number) => d<SurveyDetail>(http.post(`/surveys/${id}/draft`)),
  duplicate: (id: number) => d<SurveyDetail>(http.post(`/surveys/${id}/duplicate`)),
  remove: (id: number) => d<void>(http.delete(`/surveys/${id}`)),
  exportCsv: async (id: number) => {
    const r = await http.get(`/surveys/${id}/export`, { responseType: 'blob' })
    return r.data as Blob
  },
}

export const leadApi = {
  search: (q: string, page = 0, size = 20) => d<Page<Lead>>(http.get('/leads', { params: { q, page, size } })),
  get: (id: number) => d<LeadDetail>(http.get(`/leads/${id}`)),
  create: (body: LeadRequest) => d<Lead>(http.post('/leads', body)),
  bulk: (body: LeadRequest[]) => d<{ created: number }>(http.post('/leads/bulk', body)),
  update: (id: number, body: LeadRequest) => d<Lead>(http.put(`/leads/${id}`, body)),
  remove: (id: number) => d<void>(http.delete(`/leads/${id}`)),
}

export const invitationApi = {
  list: (surveyId: number) => d<Invitation[]>(http.get(`/surveys/${surveyId}/invitations`)),
  create: (surveyId: number, leadIds: number[]) =>
    d<Invitation[]>(http.post(`/surveys/${surveyId}/invitations`, { leadIds })),
  quick: (surveyId: number, lead: LeadRequest) =>
    d<Invitation>(http.post(`/surveys/${surveyId}/invitations/quick`, { lead })),
  remove: (id: number) => d<void>(http.delete(`/invitations/${id}`)),
}

export const analyticsApi = {
  dashboard: () => d<Dashboard>(http.get('/dashboard')),
  survey: (surveyId: number, leadId?: number) =>
    d<SurveyAnalytics>(http.get(`/surveys/${surveyId}/analytics`, { params: { leadId } })),
  responses: (surveyId: number, leadId?: number, page = 0, size = 20) =>
    d<Page<ResponseListItem>>(http.get(`/surveys/${surveyId}/responses`, { params: { leadId, page, size } })),
  response: (id: number) => d<ResponseDetail>(http.get(`/responses/${id}`)),
  removeResponse: (id: number) => d<void>(http.delete(`/responses/${id}`)),
}

export const publicApi = {
  invitation: (token: string) => d<PublicSurvey>(http.get(`/public/invitations/${token}`)),
  submitInvitation: (token: string, body: SubmitRequest) =>
    d<{ responseId: number; thankYouMessage: string }>(http.post(`/public/invitations/${token}/responses`, body)),
  survey: (slug: string) => d<PublicSurvey>(http.get(`/public/surveys/${slug}`)),
  submitSurvey: (slug: string, body: SubmitRequest) =>
    d<{ responseId: number; thankYouMessage: string }>(http.post(`/public/surveys/${slug}/responses`, body)),
}
