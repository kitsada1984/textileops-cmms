import { MessageSquare } from 'lucide-react'
import { LineOaToggle } from './lineOaToggle.jsx'
import { LineOaForm } from './lineOaForm.jsx'
import { LineNotifyForm } from './lineNotifyForm.jsx'
import { LineAppUrl } from './lineAppUrl.jsx'
import { LineOauthActions } from './lineOauthActions.jsx'
import { SectionCard } from './settingsComponents.jsx'

export function LineSettings({ line, setLine, lineContacts, lineContactLoading, lineTesting, lineIsOk, lineMsg, webhookCopied, setWebhookCopied, showLineToken, setShowLineToken, loadLineContactsList, addLineContact, saveLine, handleTestLine, toast }) {
  return (
      <SectionCard icon={MessageSquare} title="ตั้งค่าการแจ้งเตือน LINE (LINE Official Account & Group)">
        <div className="space-y-5">
      <LineOaToggle line={line} setLine={setLine} />

      <LineOaForm line={line} setLine={setLine} lineContacts={lineContacts} lineContactLoading={lineContactLoading} webhookCopied={webhookCopied} setWebhookCopied={setWebhookCopied} showLineToken={showLineToken} setShowLineToken={setShowLineToken} loadLineContactsList={loadLineContactsList} addLineContact={addLineContact} />

      <LineNotifyForm line={line} setLine={setLine} />

      <LineAppUrl line={line} setLine={setLine} />

      <LineOauthActions line={line} setLine={setLine} lineTesting={lineTesting} lineIsOk={lineIsOk} lineMsg={lineMsg} saveLine={saveLine} handleTestLine={handleTestLine} toast={toast} />

        </div>
      </SectionCard>
  )
}
