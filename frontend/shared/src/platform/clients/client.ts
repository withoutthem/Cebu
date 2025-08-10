// shared/src/platform/clients/client.ts

import axios, { AxiosHeaders } from 'axios';
import { ENV } from './env';

type AxiosLike = ReturnType<typeof axios.create>;
let clientRef: AxiosLike | null = null;

const createClient = (): AxiosLike => {
  const instance = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    withCredentials: ENV.API_WITH_CREDENTIALS,
    headers: AxiosHeaders.from({ 'Content-Type': 'application/json' }),
  });

  instance.interceptors.request.use((config) => {
    config.headers = AxiosHeaders.from(config.headers);
    const token = (globalThis as any).__ACCESS_TOKEN__ as string | undefined;
    if (token) (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    return config;
  });

  return instance;
};

export const httpClient = (): AxiosLike => {
  clientRef ??= createClient();
  return clientRef;
};
