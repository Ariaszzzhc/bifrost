import {
  BifrostCall,
  createHttpServer,
  HttpServer,
  RequestHandler,
  Routes,
} from "./server/server.ts";

class Bifrost {
  private routes: Routes;
  private httpServer?: HttpServer;

  constructor() {
    this.routes = new Routes();
  }

  public routing(handler: (routes: Routes) => void) {
    handler(this.routes);
  }

  private httpServerRequestHandler: RequestHandler = async (req) => {
    const { url, method } = req;

    if (this.routes.check(url)) {
      const route = this.routes
        .getRoute(url)!!
        .find((r) => r.method.toString() == method);

      if (route) {
        const { handler } = route;
        await handler(new BifrostCall(req));
      } else {
        await this.notFoundHandler(req);
      }
    } else {
      await this.notFoundHandler(req);
    }
  };

  private notFoundHandler: RequestHandler = async (req) => {
    await req.respond({ body: "Not Found" });
  };

  public start(host: string, port: number) {
    if (this.httpServer) {
      throw Error("Server already started");
    }

    this.httpServer = createHttpServer(
      host,
      port,
      this.httpServerRequestHandler
    );
  }
}

interface BifrostConfig {
  host: string;
  port: number;
}

export const launch = (
  config: BifrostConfig,
  handler: (biofrost: Bifrost) => unknown
) => {
  const { host, port } = config;
  const bifrost = new Bifrost();
  handler(bifrost);
  bifrost.start(host, port);
};
