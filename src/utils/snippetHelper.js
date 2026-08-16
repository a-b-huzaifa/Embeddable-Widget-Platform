/**
 * Generates an embeddable script tag snippet for a given widget ID.
 * Format: <script src="http://localhost:PORT/widget.js?id=WIDGET_ID"></script>
 *
 * @param {string} widgetId - The unique UUID of the widget
 * @returns {string} Ready-to-paste embed snippet
 */
function generateEmbedSnippet(widgetId) {
  const port = process.env.PORT || 3000;
  return `<script src="http://localhost:${port}/widget.js?id=${widgetId}"></script>`;
}

module.exports = {
  generateEmbedSnippet
};
