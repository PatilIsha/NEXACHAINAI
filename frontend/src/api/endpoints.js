import client from './client';

export const authApi = {
  register: (payload) => client.post('/auth/register', payload),
  login: (payload) => client.post('/auth/login', payload),
  me: () => client.get('/auth/me'),
};

export const investmentApi = {
  plans: () => client.get('/investments/plans'),
  create: (payload) => client.post('/investments', payload),
  list: (params) => client.get('/investments', { params }),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard'),
};

export const roiApi = {
  history: (params) => client.get('/roi/history', { params }),
};

export const referralApi = {
  direct: (params) => client.get('/referrals/direct', { params }),
  tree: (params) => client.get('/referrals/tree', { params }),
  income: (params) => client.get('/referrals/income', { params }),
};
