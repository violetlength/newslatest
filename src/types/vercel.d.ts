// Vercel类型定义
export interface VercelRequest {
  method?: string;
  url?: string;
  query: Record<string, string | string[]>;
  body?: any;
  headers: Record<string, string>;
}

export interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  send(data: any): void;
  end(): void;
  setHeader(name: string, value: string): VercelResponse;
}

export type VercelHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

declare module '@vercel/node' {
  export function handler(req: VercelRequest, res: VercelResponse): void | Promise<void>;
}
