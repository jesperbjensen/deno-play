import {
  graphql,
  buildSchema,
} from "https://cdn.pika.dev/graphql@^15.0.0";
import { ServerRequest } from "https://deno.land/std@0.53.0/http/server.ts";

const schema = buildSchema(
  new TextDecoder("utf-8").decode(await Deno.readFile("./schema.graphql")),
);

export async function execute(root: any, req: ServerRequest) {
  var final = await Deno.readAll(req.body);

  const decoder = new TextDecoder(
    req.headers.get("content-encoding") ?? "utf-8",
  );

  let decodedValue = decoder.decode(
    final,
  );

  let parsed = JSON.parse(decodedValue);

  console.log(parsed);
  let result = await graphql(
    schema,
    parsed.query,
    root,
    null,
    parsed.variables,
  );

  return JSON.stringify(result);
}
