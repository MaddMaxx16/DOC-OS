import { useState } from 'react'

function DispatcherProfileScreen({ profile, onSave, onBack }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    homeMarket: profile?.homeMarket || 'New York Metro',
    targetFeePercent: profile?.targetFeePercent ?? 8,
    preferredEquipment: profile?.preferredEquipment || "53' Dry Van",
    preferredRegion: profile?.preferredRegion || 'Northeast',
  })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const ready = form.displayName.trim().length >= 2
  return <div className="phone-page dispatcher-profile-screen">
    <header className="cs-signup-header"><button type="button" onClick={onBack}>‹</button><div><span>CARRIERSOURCE</span><h2>Create dispatcher profile</h2><p>This is the business identity carriers will see.</p></div></header>
    <div className="cs-profile-form">
      <label><span>DISPATCHER / COMPANY NAME</span><input value={form.displayName} onChange={(e)=>update('displayName', e.target.value)} placeholder="e.g. Northstar Dispatch" /></label>
      <label><span>HOME MARKET</span><input value={form.homeMarket} onChange={(e)=>update('homeMarket', e.target.value)} /></label>
      <label><span>TARGET DISPATCH FEE</span><div className="cs-input-suffix"><input type="number" min="1" max="20" value={form.targetFeePercent} onChange={(e)=>update('targetFeePercent', Number(e.target.value))} /><b>%</b></div></label>
      <label><span>PREFERRED EQUIPMENT</span><select value={form.preferredEquipment} onChange={(e)=>update('preferredEquipment', e.target.value)}><option>53' Dry Van</option><option>Reefer</option><option>Flatbed</option></select></label>
      <label><span>PREFERRED REGION</span><select value={form.preferredRegion} onChange={(e)=>update('preferredRegion', e.target.value)}><option>Northeast</option><option>Local / NY-NJ</option><option>Regional</option></select></label>
      <button type="button" className="docos-primary-action" disabled={!ready} onClick={()=>onSave?.({ ...form, displayName: form.displayName.trim(), created: true })}>CREATE PROFILE</button>
    </div>
  </div>
}
export default DispatcherProfileScreen
