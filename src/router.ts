import { basics, combine, contentTypes } from '@worker-tools/middleware';
import { WorkerRouter, Method } from '@worker-tools/router';

export interface RouteArgs {
  request: Request;
  url: URL;
  pathname: string;
  searchParams: URLSearchParams
  headers: Headers;
  method: Method;
  params: { [key: string]: string | undefined };
  type: string;
}

export const mw = combine(basics(), contentTypes(['text/html', 'application/json']))
export const router = new WorkerRouter()

