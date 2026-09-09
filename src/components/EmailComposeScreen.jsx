import { useMemo, useState } from 'react'

const CATEGORY_ORDER = [
  ['load-offer', 'FreightLink Loads'],
  ['pod', 'PODs'],
  ['invoice', 'Invoices'],
  ['agreement', 'Agreements'],
  ['exception-report', 'Exception Reports'],
]

function attachmentCategory(item) {
  if (item.type === 'load-offer') return 'load-offer'
  if (item.type === 'pod') return 'pod'
  if (item.type === 'invoice') return 'invoice'
  if (item.type === 'exception-report') return 'exception-report'
  if (['dispatch-agreement', 'agreement'].includes(item.type)) return 'agreement'
  return item.type || 'other'
}

function EmailComposeScreen({ contacts = [], attachments = [], context = {}, onBack, onSend, onOpenAttachment }) {
  const initialRecipient = context.suggestedRecipientId && contacts.some((item) => item.id === context.suggestedRecipientId) ? context.suggestedRecipientId : contacts[0]?.id || ''
  const [recipientId, setRecipientId] = useState(initialRecipient)
  const [subject, setSubject] = useState(context.subject || '')
  const [body, setBody] = useState(context.body || '')
  const scopedAttachments = useMemo(() => context.loadId ? attachments.filter((item) => item.loadId === context.loadId) : attachments, [attachments, context.loadId])
  const defaultAttachmentIds = useMemo(() => {
    if (!context.loadId) return []
    const required = context.workflowType === 'carrier-approval' ? ['load-offer'] : context.workflowType === 'pod-correction' ? ['pod', 'exception-report'] : context.workflowType === 'invoice-submission' ? ['invoice', 'pod'] : []
    return scopedAttachments.filter((item) => required.includes(attachmentCategory(item))).map((item) => item.id)
  }, [scopedAttachments, context.loadId, context.workflowType])
  const [selectedAttachments, setSelectedAttachments] = useState(() => defaultAttachmentIds)
  const [category, setCategory] = useState(context.workflowType === 'carrier-approval' ? 'load-offer' : context.workflowType === 'pod-correction' ? 'pod' : context.workflowType === 'invoice-submission' ? 'invoice' : '')
  const [candidateId, setCandidateId] = useState('')
  const [error, setError] = useState('')

  const recipient = contacts.find((item) => item.id === recipientId)
  const selected = useMemo(() => scopedAttachments.filter((item) => selectedAttachments.includes(item.id)), [scopedAttachments, selectedAttachments])
  const categories = useMemo(() => CATEGORY_ORDER.filter(([key]) => scopedAttachments.some((item) => attachmentCategory(item) === key)), [scopedAttachments])
  const categoryFiles = useMemo(() => scopedAttachments.filter((item) => attachmentCategory(item) === category && !selectedAttachments.includes(item.id)), [scopedAttachments, category, selectedAttachments])
  const candidate = categoryFiles.find((item) => item.id === candidateId) || null

  const removeAttachment = (id) => setSelectedAttachments((current) => current.filter((item) => item !== id))
  const addAttachment = () => {
    if (!candidateId) return
    setSelectedAttachments((current) => current.includes(candidateId) ? current : [...current, candidateId])
    setCandidateId('')
  }

  const send = () => {
    if (!recipient) return setError('Choose a recipient before sending.')
    if (!subject.trim()) return setError('Add a subject before sending.')
    const ok = onSend?.({ recipient, subject: subject.trim(), body: body.trim() || context.defaultBody || 'Please review the attached documents.', attachments: selected, context })
    if (ok === false) return
  }

  return (
    <div className="phone-page email-compose-screen email-compose-v3">
      <header className="email-compose-toolbar">
        <button type="button" onClick={onBack} aria-label="Back to inbox">‹</button>
        <div><span>EMAIL</span><strong>New message</strong></div>
        <span className="email-compose-toolbar-spacer" aria-hidden="true" />
      </header>

      <div className="email-compose-scroll">
        {context.label && <div className="email-compose-context"><span>WORKFLOW</span><strong>{context.label}</strong>{context.loadNumber && <small>{context.loadNumber}</small>}</div>}
        {context.loadId && <div className="email-related-record"><span>RELATED LOAD</span><strong>{context.loadNumber || context.loadId}</strong><small>This email stays linked to the FreightLink load.</small></div>}

        <label className="email-compose-field"><span>TO</span><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>{contacts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="email-compose-field"><span>SUBJECT</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" /></label>
        <label className="email-compose-field email-compose-body-field"><span>MESSAGE</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows="7" placeholder="Write a message" /></label>

        <section className="email-attachment-picker compact attachment-dropdown-picker">
          <div className="email-attachment-picker-heading"><div><span>ATTACHMENTS</span><strong>Add a file</strong></div><small>{selected.length} attached</small></div>

          {selected.length > 0 && (
            <div className="email-attached-links">
              {selected.map((item) => (
                <div className="email-file-link attached" key={item.id}>
                  <button type="button" className="email-file-open" onClick={() => onOpenAttachment?.(item)}>
                    <span className="email-paperclip" aria-hidden="true">📎</span>
                    <span><strong>{item.title}</strong><small>{item.meta || item.type}</small></span>
                  </button>
                  <button type="button" className="email-file-remove" onClick={() => removeAttachment(item.id)} aria-label={`Remove ${item.title}`}>×</button>
                </div>
              ))}
            </div>
          )}

          {categories.length > 0 ? (
            <div className="attachment-dropdown-controls">
              <label><span>DOCUMENT TYPE</span><select value={category} onChange={(event) => { setCategory(event.target.value); setCandidateId('') }}><option value="">Choose type…</option>{categories.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
              <label><span>FILE</span><select value={candidateId} disabled={!category || categoryFiles.length === 0} onChange={(event) => setCandidateId(event.target.value)}><option value="">{!category ? 'Choose document type first…' : categoryFiles.length === 0 ? 'No available files' : 'Choose file…'}</option>{categoryFiles.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
              {candidate && <button type="button" className="attachment-preview-link" onClick={() => onOpenAttachment?.(candidate)}>📎 Preview {candidate.title}</button>}
              <button type="button" className="attachment-add-button" disabled={!candidateId} onClick={addAttachment}>ATTACH FILE</button>
            </div>
          ) : selected.length === 0 ? <div className="email-compose-empty">No documents are available to attach yet.</div> : null}
        </section>

        {error && <div className="email-compose-error" role="alert">{error}</div>}
      </div>
      <div className="email-compose-bottom"><button type="button" className="docos-primary-action" onClick={send}>SEND EMAIL</button></div>
    </div>
  )
}

export default EmailComposeScreen
