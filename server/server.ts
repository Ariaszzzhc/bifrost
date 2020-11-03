import { Deferred, deferred } from "https://deno.land/std/async/deferred.ts";
import {
  serve,
  Server,
  ServerRequest,
} from "https://deno.land/std/http/server.ts";

export type RequestHandler = (req: ServerRequest) => Promise<unknown>;

export interface HttpServer {
  rootJob: Promise<void>;
  handleJob: Promise<void>;
  denoServer: Deferred<Server>;
}

export const createHttpServer = (
  host: string,
  port: number,
  handler: RequestHandler,
): HttpServer => {
  const server = deferred<Server>();
  const serverLatch = deferred();

  const rootJob = (async () => {
    await serverLatch;
  })();

  const handleJob = (async () => {
    const denoServer = serve({
      hostname: host,
      port: port,
    });

    server.resolve(denoServer);

    for await (const req of denoServer) {
      handler(req);
    }
  })();

  handleJob
    .then(() => {
      serverLatch.resolve();
    })
    .catch((e) => {
      server.reject(e);
    });

  return {
    rootJob,
    handleJob,
    denoServer: server,
  };
};
type CallHandler = (call: BifrostCall) => Promise<unknown>;

enum HttpMethod {
  GET = "GET",
  POST = "POST",
  DELETE = "DELETE",
  PATCH = "PATCH",
  PUT = "PUT",
}

interface Route {
  method: HttpMethod;
  handler: CallHandler;
}

export class Routes {
  private routes: Map<string, Route[]>;

  constructor() {
    this.routes = new Map<string, Route[]>();
  }

  public get(path: string, handler: CallHandler) {
    this.add(path, HttpMethod.GET, handler);
  }

  public delete(path: string, handler: CallHandler) {
    this.add(path, HttpMethod.DELETE, handler);
  }

  public post(path: string, handler: CallHandler) {
    this.add(path, HttpMethod.POST, handler);
  }

  public put(path: string, handler: CallHandler) {
    this.add(path, HttpMethod.PUT, handler);
  }

  public patch(path: string, handler: CallHandler) {
    this.add(path, HttpMethod.PATCH, handler);
  }

  public add(path: string, method: HttpMethod, handler: CallHandler) {
    if (this.routes.has(path)) {
      const rs = this.routes.get(path);
      this.routes.set(path, [...rs!!, { method, handler }]);
    } else {
      this.routes.set(path, [{ method, handler }]);
    }
  }

  public check(path: string) {
    return this.routes.has(path);
  }

  public getRoute(path: string): Route[] | undefined {
    return this.routes.get(path);
  }
}

export class BifrostCall {
  private req: ServerRequest;

  constructor(req: ServerRequest) {
    this.req = req;
  }

  public async respondText(text: string): Promise<void> {
    await this.req.respond({ body: text });
  }

  public async respondJson(obj: unknown): Promise<void> {
    await this.req.respond({ body: JSON.stringify(obj) });
  }
}
