// Vite's ?raw import: the file's text as a string (used to load db/schema.sql in tests).
declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}
