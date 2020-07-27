import { deferred, Deferred } from "https://deno.land/std/async/deferred.ts";
import { BufReader, BufWriter } from "https://deno.land/std/io/bufio.ts";
import { ServerRequest } from "https://deno.land/std/http/server.ts";
import { readRequest, writeResponse } from "https://deno.land/std/http/_io.ts";
import { encode } from "https://deno.land/std/encoding/utf8.ts";

// type RequestHandler = (req: ServerRequest) => Promise<void>;

interface RequestHandler {
  (req: ServerRequest): Promise<unknown>
}

export interface HttpServer {
  rootServerPromise: Promise<unknown>;
  acceptPromise: Promise<unknown>;
  serverListenerPromise: Deferred<Deno.Listener>;
}

export interface HttpServerSettings {
  port: number;
  host: string;
}

export function createHttpServer(
  settings: HttpServerSettings,
  handler: RequestHandler,
): HttpServer {
  const listenerPromise = deferred<Deno.Listener>();
  const serverLatch = deferred();

  const serverPromise = new Promise((resolve, reject) => {
    serverLatch.then(resolve).catch((e) => reject(e));
  });

  const acceptJob = async () => {
    const listener = Deno.listen({
      port: settings.port,
      hostname: settings.host,
    });

    listenerPromise.resolve(listener);

    while (true) {
      try {
        const conn = await listener.accept();

        const clientPromise = startServerConnectionPipeline(conn, handler);

        clientPromise.then(() => {
          conn.close();
        });
      } catch (error) {
        if (
          error instanceof Deno.errors.BadResource ||
          error instanceof Deno.errors.InvalidData ||
          error instanceof Deno.errors.UnexpectedEof
        ) {
        }

        throw error;
      }
    }
  };

  const acceptPromise = acceptJob();

  acceptPromise
    .then(() => {
      serverLatch.resolve();
    })
    .catch((e) => {
      listenerPromise.reject(e);
    });

  return {
    rootServerPromise: serverPromise,
    acceptPromise: acceptPromise,
    serverListenerPromise: listenerPromise,
  };
}

async function startServerConnectionPipeline(
  conn: Deno.Conn,
  handler: RequestHandler,
) {
  const reader = new BufReader(conn);
  const writer = new BufWriter(conn);

  while (true) {
    let request: ServerRequest | null;
    try {
      request = await readRequest(conn, reader);
    } catch (error) {
      if (
        error instanceof Deno.errors.InvalidData ||
        error instanceof Deno.errors.UnexpectedEof
      ) {
        await writeResponse(writer, {
          status: 400,
          body: encode(`${error.message}\r\n\r\n`),
        });
      }

      break;
    }

    if (request === null) {
      break;
    }

    request.w = writer;

    await handler(request);

    const resError = await request.done;

    if (resError) {
      return;
    }

    await request.finalize();
  }
}

// Bifrost Application

class Application {
  server: HttpServer | null;
  enviroment: ApplicationEnviroment;

  constructor(enviroment: ApplicationEnviroment) {
    this.server = null;
    this.enviroment = enviroment;
  }

  public run() {
    this.server = createHttpServer(this.enviroment.settings, async (req) => {
      const call = new ApplicationCall(req);
      // intercepter

      // request handling
      try {
      } catch (error) {
        // error handling
      } finally {
      }
    });
  }
}

interface ApplicationEnviroment {
  settings: HttpServerSettings;
}

class ApplicationCall {
  private request: ServerRequest;

  constructor(request: ServerRequest) {
    this.request = request;
  }

  public async respond<T>(value: T) {
    await this.request.respond({
      body: JSON.stringify(value),
    });
  }

  public async respondText(value: string) {
    await this.request.respond({
      body: value,
    });
  }
}