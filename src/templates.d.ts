// templates/*.gs are bundled as text (wrangler.toml `rules`): importing one gives its contents.
declare module '*.gs' {
  const text: string;
  export default text;
}
