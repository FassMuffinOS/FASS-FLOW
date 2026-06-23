import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Camera, Plus, Trash2, Image as ImageIcon, Copy, Check, FolderPlus, ChevronDown,
} from 'lucide-react'
import './Restoration.css'

// Room-by-room itemized loss list — the deliverable a restoration estimator
// sends after walking a fire/water/storm loss: what room it's from, what
// it'll cost to replace, quantity, and (now) photo verification per item so
// the same list can double as a work-progress tracker, not just a one-time
// number.
const LOSS_TYPES = ['Fire', 'Water', 'Wind / Storm', 'Mold', 'Vandalism', 'Other']
const COMMON_ROOMS = [
  'Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3',
  'Bathroom', 'Hallway', 'Garage', 'Basement', 'Attic', 'Exterior', 'Other',
]
const STATUS_LABELS = { documented: 'Documented', in_progress: 'In progress', completed: 'Completed' }
const STATUS_ORDER = ['documented', 'in_progress', 'completed']

function fmt(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Restoration() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [projects, setProjects] = useState([])
  const [items, setItems] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [newProject, setNewProject] = useState({
    name: '', client_name: '', property_address: '', loss_type: LOSS_TYPES[0], loss_date: '',
  })

  const [form, setForm] = useState({ room: COMMON_ROOMS[0], item_description: '', quantity: '1', unit_cost: '', notes: '' })
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputs = useRef({})

  useEffect(() => { if (userId) loadProjects() }, [userId])
  useEffect(() => { if (selectedProjectId) loadItems(selectedProjectId) }, [selectedProjectId])

  async function loadProjects() {
    setLoading(true)
    const { data } = await supabase
      .from('restoration_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setProjects(data || [])
    if (data?.length && !selectedProjectId) setSelectedProjectId(data[0].id)
    setLoading(false)
  }

  async function loadItems(projectId) {
    setItemsLoading(true)
    const { data } = await supabase
      .from('restoration_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    setItems(data || [])
    setItemsLoading(false)
  }

  async function createProject(e) {
    e.preventDefault()
    if (!newProject.name.trim()) return
    const { data, error: insertError } = await supabase.from('restoration_projects').insert({
      user_id: userId,
      name: newProject.name.trim(),
      client_name: newProject.client_name.trim() || null,
      property_address: newProject.property_address.trim() || null,
      loss_type: newProject.loss_type,
      loss_date: newProject.loss_date || null,
    }).select().single()
    if (insertError) { setError(insertError.message); return }
    setProjects(prev => [data, ...prev])
    setSelectedProjectId(data.id)
    setNewProject({ name: '', client_name: '', property_address: '', loss_type: LOSS_TYPES[0], loss_date: '' })
    setShowNewProject(false)
  }

  async function addItem(e) {
    e.preventDefault()
    if (!selectedProjectId || !form.item_description.trim()) return
    const qty = parseFloat(form.quantity) || 1
    const cost = parseFloat(form.unit_cost) || 0
    const { data, error: insertError } = await supabase.from('restoration_items').insert({
      project_id: selectedProjectId,
      user_id: userId,
      room: form.room,
      item_description: form.item_description.trim(),
      quantity: qty,
      unit_cost: cost,
      notes: form.notes.trim() || null,
    }).select().single()
    if (insertError) { setError(insertError.message); return }
    setItems(prev => [...prev, data])
    setForm(prev => ({ ...prev, item_description: '', quantity: '1', unit_cost: '', notes: '' }))
  }

  async function updateStatus(itemId, status) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i))
    await supabase.from('restoration_items').update({ status, updated_at: new Date().toISOString() }).eq('id', itemId)
  }

  async function deleteItem(itemId) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await supabase.from('restoration_items').delete().eq('id', itemId)
  }

  // Photo verification is optional — items work fine with none — but
  // attaching one is how a sub proves the work matches the documented loss,
  // which is the actual project-management value here.
  async function uploadPhoto(itemId, file) {
    if (!file || !userId) return
    setUploadingId(itemId)
    setError('')
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/${selectedProjectId}/${itemId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('restoration-photos').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: pub } = supabase.storage.from('restoration-photos').getPublicUrl(path)
      const photo_url = pub?.publicUrl
      await supabase.from('restoration_items').update({ photo_url }).eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, photo_url } : i))
    } catch (err) {
      setError(err.message || 'Photo upload failed.')
    } finally {
      setUploadingId(null)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  const itemsWithTotal = useMemo(
    () => items.map(i => ({ ...i, total: Number(i.quantity) * Number(i.unit_cost) })),
    [items]
  )
  const grandTotal = itemsWithTotal.reduce((s, i) => s + i.total, 0)
  const photoCount = items.filter(i => i.photo_url).length
  const byRoom = useMemo(() => {
    const groups = {}
    for (const i of itemsWithTotal) {
      if (!groups[i.room]) groups[i.room] = []
      groups[i.room].push(i)
    }
    return groups
  }, [itemsWithTotal])

  function copyDetailedList() {
    const lines = [
      `RESTORATION LOSS ESTIMATE${selectedProject ? ` — ${selectedProject.name}` : ''}`,
      selectedProject?.client_name ? `Client: ${selectedProject.client_name}` : null,
      selectedProject?.property_address ? `Property: ${selectedProject.property_address}` : null,
      selectedProject?.loss_type ? `Loss type: ${selectedProject.loss_type}` : null,
      selectedProject?.loss_date ? `Loss date: ${selectedProject.loss_date}` : null,
      '',
    ].filter(Boolean)
    for (const [room, roomItems] of Object.entries(byRoom)) {
      lines.push(`${room.toUpperCase()}`)
      for (const i of roomItems) {
        lines.push(`  - ${i.item_description} | qty ${i.quantity} | ${fmt(i.unit_cost)}/unit | total ${fmt(i.total)} | ${STATUS_LABELS[i.status] || i.status}${i.photo_url ? ' | photo on file' : ''}`)
        if (i.notes) lines.push(`    note: ${i.notes}`)
      }
      lines.push('')
    }
    lines.push(`TOTAL REPLACEMENT COST: ${fmt(grandTotal)}`)
    lines.push(`Items documented with photo: ${photoCount}/${items.length}`)
    navigator.clipboard?.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="rst-loading">Loading your claims…</div>

  return (
    <div className="rst">
      <div className="rst-header">
        <div>
          <h1><Camera size={22} /> Restoration</h1>
          <p>Walk the loss, log it room by room — item, quantity, cost to replace, and a photo for verification — then send the detailed list or track repair progress against it.</p>
        </div>
      </div>

      {error && <p className="rst-error">{error}</p>}

      <div className="rst-card">
        <div className="rst-project-row">
          <select
            className="rst-project-select"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            {projects.length === 0 && <option value="">No claims yet</option>}
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.loss_type ? ` — ${p.loss_type}` : ''}</option>)}
          </select>
          <button type="button" className="rst-btn" onClick={() => setShowNewProject(v => !v)}>
            <FolderPlus size={14} /> New claim <ChevronDown size={13} />
          </button>
        </div>

        {showNewProject && (
          <form className="rst-new-project-form" onSubmit={createProject}>
            <input
              type="text" placeholder="Claim / job name *"
              value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
            />
            <input
              type="text" placeholder="Client name"
              value={newProject.client_name} onChange={e => setNewProject(p => ({ ...p, client_name: e.target.value }))}
            />
            <input
              type="text" placeholder="Property address"
              value={newProject.property_address} onChange={e => setNewProject(p => ({ ...p, property_address: e.target.value }))}
            />
            <select value={newProject.loss_type} onChange={e => setNewProject(p => ({ ...p, loss_type: e.target.value }))}>
              {LOSS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="date" value={newProject.loss_date} onChange={e => setNewProject(p => ({ ...p, loss_date: e.target.value }))}
            />
            <button type="submit" className="rst-btn rst-btn-primary">Create</button>
          </form>
        )}

        {selectedProject && (
          <div className="rst-project-meta">
            {selectedProject.client_name && <span>{selectedProject.client_name}</span>}
            {selectedProject.property_address && <span>{selectedProject.property_address}</span>}
            {selectedProject.loss_date && <span>Loss date: {selectedProject.loss_date}</span>}
          </div>
        )}
      </div>

      {selectedProjectId && (
        <div className="rst-card">
          <form className="rst-item-form" onSubmit={addItem}>
            <input
              type="text" list="rst-room-list" placeholder="Room"
              value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
            />
            <datalist id="rst-room-list">
              {COMMON_ROOMS.map(r => <option key={r} value={r} />)}
            </datalist>
            <input
              type="text" placeholder="Item (e.g. Sofa, smoke/fire damaged)" className="rst-item-desc-input"
              value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))}
            />
            <input
              type="number" min="0" step="any" placeholder="Qty"
              value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
            <input
              type="number" min="0" step="0.01" placeholder="Cost to replace ($/unit)"
              value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
            />
            <button className="rst-btn rst-btn-primary" type="submit"><Plus size={14} /> Add item</button>
          </form>

          {itemsLoading && <p className="rst-empty-note">Loading items…</p>}
          {!itemsLoading && items.length === 0 && (
            <p className="rst-empty-note">No items logged yet — add the first damaged item above.</p>
          )}

          {!itemsLoading && Object.keys(byRoom).length > 0 && (
            <div className="rst-room-groups">
              {Object.entries(byRoom).map(([room, roomItems]) => (
                <div key={room} className="rst-room-group">
                  <div className="rst-room-title">{room}</div>
                  {roomItems.map(i => (
                    <div key={i.id} className="rst-item-row">
                      <div className="rst-item-thumb">
                        {i.photo_url ? (
                          <a href={i.photo_url} target="_blank" rel="noreferrer">
                            <img src={i.photo_url} alt={i.item_description} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="rst-photo-btn"
                            onClick={() => fileInputs.current[i.id]?.click()}
                            disabled={uploadingId === i.id}
                          >
                            <ImageIcon size={15} />
                          </button>
                        )}
                        <input
                          ref={el => { fileInputs.current[i.id] = el }}
                          type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => uploadPhoto(i.id, e.target.files?.[0])}
                        />
                      </div>
                      <div className="rst-item-main">
                        <div className="rst-item-title">{i.item_description}</div>
                        <div className="rst-item-meta">
                          Qty {i.quantity} · {fmt(i.unit_cost)}/unit{i.notes ? ` · ${i.notes}` : ''}
                        </div>
                      </div>
                      <div className="rst-item-total">{fmt(i.total)}</div>
                      <div className="rst-status-row">
                        {STATUS_ORDER.map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`rst-status-chip ${i.status === s ? 'rst-status-active' : ''}`}
                            onClick={() => updateStatus(i.id, s)}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                      <button className="rst-icon-btn" onClick={() => deleteItem(i.id)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedProjectId && items.length > 0 && (
        <div className="rst-card">
          <div className="rst-summary-row">
            <div className="rst-summary-item"><label>Items</label><span>{items.length}</span></div>
            <div className="rst-summary-item"><label>With photo</label><span>{photoCount}/{items.length}</span></div>
            <div className="rst-summary-item rst-summary-total"><label>Total replacement cost</label><span>{fmt(grandTotal)}</span></div>
          </div>
          <button className="rst-btn" onClick={copyDetailedList}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy detailed list</>}
          </button>
        </div>
      )}
    </div>
  )
}
