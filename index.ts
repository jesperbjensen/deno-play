import { serve } from "https://deno.land/std@0.53.0/http/server.ts";
import Dexecutor from "https://deno.land/x/dexecutor/mod.ts";
import Dex from "https://deno.land/x/dex/mod.ts";

let dex = Dex({ client: "sqlite3" });

import { execute } from "./graphql.ts";
import { Note } from "./schema.ts";

// Creating the query executor client
let dexecutor = new Dexecutor({
  client: "sqlite3",
  connection: {
    filename: "test.db",
  },
  useNullAsDefault: true,
});

// Opening the connection
await dexecutor.connect();

await dexecutor.execute(
  `
  CREATE TABLE IF NOT EXISTS notes  (
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL
  );
`,
);

const s = serve({ port: 8000 });
console.log("http://localhost:8000/");

let headers = new Headers();
headers.set("content-type", "text/html");

const noteSelect = () => dex.select("id", "content").from("notes");

function mapNote(r: any): Note {
  return {
    id: r[0],
    content: r[1],
  };
}

async function getNoteById(id: number) {
  var result = (await dexecutor.execute(
    noteSelect().where({ id }).toString(),
  ));
  return mapNote(
    (result[0]),
  );
}

async function insertNote(content: string) {
  const insertSql = dex.insert({ content }).into("notes");
  await dexecutor.execute(insertSql.toString());
  const id = await dexecutor.execute("SELECT last_insert_rowid();"); // TODO: I guess that this is not thread save
  return id[0][0] as number;
}

async function updateNote(id: number, obj: Partial<Note>) {
  const updateSql = dex("notes").where({ id }).update(obj);
  await dexecutor.execute(updateSql.toString());
}

async function deleteNote(id: number) {
  const deleteSql = dex("notes").where({ id }).delete();
  await dexecutor.execute(deleteSql.toString());
}

const root = {
  notes: async () => {
    var result = (await dexecutor.execute(
      noteSelect().toString(),
    ));
    var notes = result.map(mapNote);
    return notes;
  },
  note: async (args: any) => {
    return getNoteById(args.id);
  },
  addNote: async ({ content }: { content: string }) => {
    let id = await insertNote(content);
    let note = await getNoteById(id);
    return note;
  },
  setNoteContent: async ({ id, content }: { id: number; content: string }) => {
    await updateNote(id, { content });
    return getNoteById(id);
  },
  deleteNote: async ({ id }: { id: number }) => {
    await deleteNote(id);
    return id;
  },
};

for await (const req of s) {
  req.respond({
    headers,
    body: await execute(root, req),
  });
}
