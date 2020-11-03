import { launch } from "./mod.ts"

launch({
  host: "0.0.0.0",
  port: 4000
}, bifrost => {
  bifrost.routing(routes => {
    routes.get("/", async call => {
      await call.respondText("Hello, World!")
    })
  })
})
