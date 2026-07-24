/**
 * Lightweight Markdown → HTML renderer for AI chat output.
 * Handles: tables, headings, bold, italic, bullet/numbered lists, horizontal rules, code blocks, line breaks.
 */
export function renderChatMarkdown(md: string): string {
  // Escape HTML entities
  let text = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // ─── Code blocks (``` ... ```) ───
  text = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre class="chat-code-block"><code>${code.trim()}</code></pre>`
  )

  // ─── Inline code (`...`) ───
  text = text.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')

  // ─── Tables ───
  text = text.replace(
    /((?:^\|.+\|$\n?)+)/gm,
    (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim())
      if (rows.length < 2) return tableBlock

      // Check if row 2 is a separator (| --- | --- |)
      const isSep = (r: string) => /^\|[\s:-]+\|$/.test(r.replace(/\|/g, m => m).trim())
      const sepIdx = rows.findIndex((r, i) => i > 0 && isSep(r))

      const parseRow = (row: string) =>
        row.split('|').slice(1, -1).map(c => c.trim())

      let html = '<div class="chat-table-wrap"><table class="chat-table">'

      if (sepIdx > 0) {
        // Has header
        html += '<thead><tr>'
        parseRow(rows[0]).forEach(c => { html += `<th>${applyInline(c)}</th>` })
        html += '</tr></thead>'
        html += '<tbody>'
        for (let i = sepIdx + 1; i < rows.length; i++) {
          html += '<tr>'
          parseRow(rows[i]).forEach(c => { html += `<td>${applyInline(c)}</td>` })
          html += '</tr>'
        }
        html += '</tbody>'
      } else {
        // No header separator — render all as body
        html += '<tbody>'
        rows.forEach(row => {
          html += '<tr>'
          parseRow(row).forEach(c => { html += `<td>${applyInline(c)}</td>` })
          html += '</tr>'
        })
        html += '</tbody>'
      }

      html += '</table></div>'
      return html
    }
  )

  // ─── Horizontal rules ───
  text = text.replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '<hr class="chat-hr" />')

  // ─── Headings ───
  text = text.replace(/^#### (.+)$/gm, '<h4 class="chat-h4">$1</h4>')
  text = text.replace(/^### (.+)$/gm, '<h3 class="chat-h3">$1</h3>')
  text = text.replace(/^## (.+)$/gm, '<h2 class="chat-h2">$1</h2>')
  text = text.replace(/^# (.+)$/gm, '<h1 class="chat-h1">$1</h1>')

  // ─── Numbered lists (1. 2. 3.) ───
  text = text.replace(
    /((?:^\d+\.\s+.+$\n?)+)/gm,
    (block) => {
      const items = block.trim().split('\n')
      const lis = items.map(item => {
        const content = item.replace(/^\d+\.\s+/, '')
        return `<li>${applyInline(content)}</li>`
      }).join('')
      return `<ol class="chat-ol">${lis}</ol>`
    }
  )

  // ─── Bullet lists (- or *) with nested sub-items ───
  text = text.replace(
    /((?:^[ ]*[-*]\s+.+$\n?)+)/gm,
    (block) => {
      const items = block.trim().split('\n')
      const lis = items.map(item => {
        const indent = item.match(/^(\s*)/)?.[1]?.length || 0
        const content = item.replace(/^\s*[-*]\s+/, '')
        const cls = indent >= 4 ? 'chat-li-nested' : ''
        return `<li class="${cls}">${applyInline(content)}</li>`
      }).join('')
      return `<ul class="chat-ul">${lis}</ul>`
    }
  )

  // ─── Paragraphs ───
  text = text.split(/\n\n+/).map(para => {
    const trimmed = para.trim()
    if (!trimmed) return ''
    // Don't wrap elements that are already HTML blocks
    if (/^<(h[1-4]|ul|ol|li|table|div|pre|hr|blockquote)/.test(trimmed)) return trimmed
    return `<p class="chat-p">${applyInline(trimmed.replace(/\n/g, '<br/>'))}</p>`
  }).join('\n')

  return text
}

/** Apply inline formatting: bold, italic, strikethrough */
function applyInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
}
