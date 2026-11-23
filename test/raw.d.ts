// Vite's ?raw import: the file's text as a string (used to load db/schema.sql in tests).
declare module '*.sql?raw' {
  const sql: string;
  export default sql;
}

// The same for the Apps Script templates in templates/.
declare module '*.gs?raw' {
  const text: string;
  export default text;
}
