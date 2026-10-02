export default {
  singleQuote: true,
  printWidth: 120,
  // Angular templates: the plain html parser flattens @if/@for blocks.
  overrides: [{ files: 'src/app/**/*.html', options: { parser: 'angular' } }],
};
