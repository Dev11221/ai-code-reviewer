function mergeFindings(staticFindings, llmFindings) {
  return [...staticFindings, ...llmFindings];
}

module.exports = { mergeFindings };