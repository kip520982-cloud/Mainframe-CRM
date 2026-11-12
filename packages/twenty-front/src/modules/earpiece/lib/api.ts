import { REST_API_BASE_URL } from '@/apollo/constants/RestApiBaseUrl';
import { SESSION_COOKIE_OPT_IN_HEADER_NAME } from 'twenty-shared/constants';

export const EP_API = `${REST_API_BASE_URL}/earpiece`;

export const earpieceFetch = (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set(SESSION_COOKIE_OPT_IN_HEADER_NAME, '1');
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${EP_API}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
};
