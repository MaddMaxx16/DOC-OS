import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getAgreementRules } from '../utils/carrierAgreement.js'
import DispatchAgreementPaper from './DispatchAgreementPaper.jsx'

function PaperworkWorkspace({
  carrier,
  dispatcherProfile,
  gameTime,
  onAccept,
  onBack,
  signedDocument = null,
}) {
  const [frontDocument, setFrontDocument] = useState('agreement')

  const rules = getAgreementRules(carrier)

  const location =
    [carrier?.city, carrier?.state].filter(Boolean).join(', ') ||
    carrier?.serviceArea ||
    'Operating market'

  const businessName =
    dispatcherProfile?.businessName ||
    dispatcherProfile?.displayName ||
    'Independent Dispatch'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="paperwork-workspace-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${carrier?.name || 'Carrier'} paperwork workspace`}
    >
      <section className="paperwork-workspace-screen">

        <header className="paperwork-workspace-toolbar">
          <button
            type="button"
            onClick={onBack}
            aria-label="Return to email"
          >
            ‹
          </button>

          <div>
            <span>CARRIERSOURCE · CASE FILE</span>
            <strong>{carrier?.name || 'Carrier'}</strong>
          </div>

          <small>{signedDocument ? 'SIGNED AGREEMENT' : 'AGREEMENT REVIEW'}</small>
        </header>

        <main className="paperwork-desk">

          <div
            className="paperwork-carrier-folder"
            aria-hidden="true"
          >
            <span className="paperwork-folder-tab">
              {carrier?.name || 'CARRIER'}
            </span>

            <div className="paperwork-folder-label">
              <span>CARRIER FILE</span>
              <strong>{carrier?.name || 'Carrier'}</strong>
              <small>{location}</small>
            </div>
          </div>

          <section
            className={`paperwork-layer paperwork-profile-layer ${
              frontDocument === 'profile' ? 'front' : 'rear'
            }`}
          >
            <article className="paperwork-support-paper carrier-profile-paper">
              <header>
                <span>CARRIERSOURCE</span>
                <h2>Carrier Profile</h2>
                <p>Operating summary</p>
              </header>

              <div className="carrier-profile-reference">
                <div>
                  <span>CARRIER</span>
                  <strong>{carrier?.name || 'Carrier'}</strong>
                </div>

                <div>
                  <span>MARKET</span>
                  <strong>{location}</strong>
                </div>

                <div>
                  <span>EQUIPMENT</span>
                  <strong>
                    {rules.equipmentScope?.join(', ') || 'Carrier equipment'}
                  </strong>
                </div>

                <div>
                  <span>PREFERRED REGION</span>
                  <strong>{rules.preferredRegion || 'Flexible'}</strong>
                </div>

                <div>
                  <span>DISPATCH FEE</span>
                  <strong>{rules.percentage}%</strong>
                </div>

                <div>
                  <span>DISPATCH BUSINESS</span>
                  <strong>{businessName}</strong>
                </div>
              </div>

              <section className="carrier-profile-status">
                <span>{signedDocument ? 'RELATIONSHIP STATUS' : 'APPLICATION STATUS'}</span>
                <strong>
                  {signedDocument
                    ? 'ACTIVE · AGREEMENT SIGNED'
                    : 'APPROVED · AGREEMENT PENDING'}
                </strong>

                <p>
                  {signedDocument
                    ? 'Signed operating agreement is active and retained in the carrier file.'
                    : 'Review and sign the carrier operating agreement before activation.'}
                </p>
              </section>

              <footer>
                <span>CARRIERSOURCE NETWORK SERVICES</span>
                <small>Carrier onboarding record</small>
              </footer>
            </article>

            {frontDocument !== 'profile' && (
              <button
                type="button"
                className="paperwork-layer-hitbox"
                onClick={() => setFrontDocument('profile')}
                aria-label="Bring Carrier Profile forward"
              />
            )}
          </section>

          <section
            className={`paperwork-layer paperwork-agreement-layer ${
              frontDocument === 'agreement' ? 'front' : 'rear'
            }`}
          >
            <div className="paperwork-agreement-sheet">
              <DispatchAgreementPaper
                carrier={carrier}
                dispatcherProfile={dispatcherProfile}
                gameTime={gameTime}
                onAccept={onAccept}
                signedDocument={signedDocument}
              />
            </div>

            {frontDocument !== 'agreement' && (
              <button
                type="button"
                className="paperwork-layer-hitbox"
                onClick={() => setFrontDocument('agreement')}
                aria-label="Bring Dispatch Agreement forward"
              />
            )}
          </section>

        </main>

        <footer className="paperwork-workspace-footer">
          <span>{signedDocument ? 'Signed carrier agreement · filed copy.' : 'Tap exposed paperwork to bring it forward.'}</span>
        </footer>

      </section>
    </div>,
    document.body,
  )
}

export default PaperworkWorkspace
