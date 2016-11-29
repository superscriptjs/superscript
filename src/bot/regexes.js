// Standard regular expressions that can be reused throughout the codebase

export default {
  captures: /<cap(\d{0,2})>/ig,
  delay: /{\s*delay\s*=\s*(\d+)\s*}/,
  filter: /\^(\w+)\(([\w<>,|\s]*)\)/i,
};
