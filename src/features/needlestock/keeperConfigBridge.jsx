import NeedleKeeperConfigModal from '../../components/repair/NeedleKeeperConfigModal'

export function KeeperConfigBridge({ keeperConfigModalOpen, setKeeperConfigModalOpen, toast }) {
  return (
      <NeedleKeeperConfigModal
        isOpen={keeperConfigModalOpen}
        onClose={() => setKeeperConfigModalOpen(false)}
        onSuccess={() => toast.success('บันทึกการตั้งค่าผู้ดูแลเข็มเรียบร้อยแล้ว')}
      />
  )
}
